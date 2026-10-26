import fs from 'node:fs/promises';
import path from 'node:path';
import {allowedUrl} from './browser.mjs';
import {sha256} from './analyze.mjs';
import {checkedTitleClick} from './meituan.mjs';

const entryName=/^(投递|投递简历|立即投递|申请职位|立即申请|Apply|Apply now)$/i;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicEntryUrl(value) {
  try {const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;
    const keep=new URLSearchParams();for(const key of ['jobUnionId','highlightType'])if(u.searchParams.has(key))keep.set(key,u.searchParams.get(key));
    u.search=keep.toString();u.hash='';return u.href;
  } catch{return null;}
}
export function classifyEntry(before,after,signals={}) {
  if(signals.filled_fields)return '检测到已填写字段，停止核验';
  if(signals.password_input||(signals.phone_input&&/验证码|短信|登录/.test(after))||
    (/登录后(?:再|即可|才可)?(?:投递|申请)|请先登录|短信验证码登录|手机号登录|扫码登录/.test(after)&&!/登录后(?:再|即可|才可)?(?:投递|申请)|请先登录|短信验证码登录|手机号登录|扫码登录/.test(before)))return '需要登录';
  if(signals.file_input&&/简历|申请信息|投递信息/.test(after))return '已进入申请表单，未填写或提交';
  if(/职位已下线|职位已关闭|该职位不存在|岗位已下架/.test(after))return '页面明确显示关闭';
  if(signals.blocked_navigation)return '跳转超出已配置官网范围，待复核';
  return '未确认后续流程，待复核';
}
async function observe(page) {
  const body=await page.locator('body').innerText({timeout:2000});
  const inputs=await page.locator('input,textarea,select').evaluateAll(nodes=>nodes.filter(n=>!!(n.offsetWidth||n.offsetHeight||n.getClientRects().length)).map(n=>({
    type:(n.type??n.tagName).toLowerCase(),hint:[n.getAttribute('placeholder'),n.getAttribute('autocomplete'),n.getAttribute('aria-label')].filter(Boolean).join(' '),
    filled:!['hidden','submit','button','checkbox','radio','select-one','select-multiple'].includes(n.type)&&!!n.value
  })));
  return {body,signals:{password_input:inputs.some(n=>n.type==='password'),phone_input:inputs.some(n=>n.type==='tel'||/手机号|手机号码|phone|tel-national/i.test(n.hint)),
    file_input:inputs.some(n=>n.type==='file'),filled_fields:inputs.some(n=>n.filled)}};
}

export const knownIntroText=text=>/AI\s*求职搭子来了/.test(text)&&/个性化荐岗/.test(text)&&/稍后再说/.test(text);
export async function dismissKnownIntro(page,actions) {
  if(actions.some(a=>a.action==='dismiss_known_intro'))return false;
  try {if(new URL(page.url()).hostname!=='jobs.bytedance.com')return false;}catch{return false;}
  const body=await page.locator('body').innerText({timeout:3000});
  if(!knownIntroText(body))return false;
  const matches=page.getByText('稍后再说',{exact:true});const visible=[];
  for(let n=0;n<await matches.count();n++)if(await matches.nth(n).isVisible())visible.push(matches.nth(n));
  if(visible.length!==1)return false;
  const action={action:'dismiss_known_intro',label:'稍后再说',observed_at:new Date().toISOString(),completed:false};
  actions.push(action);
  await visible[0].click({timeout:5000,noWaitAfter:true});
  action.completed=true;
  return true;
}
export async function clickEntryAfterIntro(page,locator,record) {
  record.ui_actions=[];record.preflight_attempts=[];
  await dismissKnownIntro(page,record.ui_actions);
  for(let n=0;n<2;n++) {
    const click={};
    try {
      await checkedTitleClick({click:async options=>{
        if(!options.trial) {
          if(record.click_attempted)throw new Error('entry_click_already_attempted');
          record.click_attempted=true;
        }
        return locator.click(options);
      }},click);
      record.click_diagnostic=click;record.preflight_attempts.push(click);return;
    } catch(error) {
      record.click_diagnostic=click;record.preflight_attempts.push(click);
      record.click_error_type=error.name??'Error';
      // 仅预检阶段被遮挡时，关闭已确认的介绍窗后重做预检；真实投递点击绝不重试。
      if(n===0&&!record.click_attempted&&click.click_hints?.pointer_intercepted&&await dismissKnownIntro(page,record.ui_actions))continue;
      return;
    }
  }
}

export async function verifyEntry(context,target,out,index,sessionId) {
  const prefix=String(index).padStart(3,'0');
  const record={company:target.company,title:target.title,url:target.url,provider:'lexmount-cloud',session_id:sessionId,
    observed_at:new Date().toISOString(),probe_version:'0.1.10',state:'未确认后续流程，待复核',click_attempted:false,
    note:'入口技术探测，与画像是否符合岗位无关。可关闭已确认的AI介绍窗，最多点击一次投递入口，不填写表单、不上传文件、不完成登录或提交申请。'};
  const popups=[],blocked=[];let page,afterPage,before='',after='',finalSignals={};
  const routeHandler=async route=>{
    const req=route.request();
    if(req.isNavigationRequest()&&!allowedUrl(req.url(),target.allowed_hosts)) {
      try {blocked.push(new URL(req.url()).origin);}catch{}
      return route.abort();
    }
    return route.continue();
  };
  try {
    if(!allowedUrl(target.url,target.allowed_hosts))throw new Error('invalid_target');
    await context.route('**/*',routeHandler);
    page=await context.newPage();page.on('popup',p=>popups.push(p));
    record.stage='读取详情';
    const response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:45000});
    record.http_status=response?.status()??null;
    for(let n=0;n<16;n++) {
      before=await page.locator('body').innerText({timeout:3000});
      if(target.title&&before.includes(target.title)&&/职位要求|任职要求|岗位(?:基本)?要求/.test(before))break;
      await page.waitForTimeout(500);
    }
    if(record.http_status>=400||!target.title||!before.includes(target.title)||!/职位要求|任职要求|岗位(?:基本)?要求/.test(before)) {
      record.state='未确认目标详情，未点击';return record;
    }
    const initial=await observe(page);
    if(initial.signals.filled_fields||initial.signals.file_input||initial.signals.password_input) {
      record.state='页面已有表单，未点击入口，待复核';return record;
    }
    await fs.writeFile(path.join(out,prefix+'-before.txt'),before);
    record.before_hash=sha256(before);
    record.before_screenshot_saved=await page.screenshot({path:path.join(out,prefix+'-before.png'),fullPage:false,timeout:5000}).then(()=>true,()=>false);
    if(/职位已下线|职位已关闭|该职位不存在|岗位已下架/.test(before)){record.state='页面明确显示关闭';return record;}
    record.stage='定位可见投递入口';
    const all=page.locator('a,button,[role="button"]');const candidates=[];
    for(let n=0;n<await all.count();n++) {
      const locator=all.nth(n);
      if(!await locator.isVisible())continue;
      const label=(await locator.innerText({timeout:2000})).trim();
      if(entryName.test(label)&&await locator.isEnabled())candidates.push({locator,label});
    }
    record.visible_enabled_entries=candidates.length;
    if(candidates.length!==1){record.state=candidates.length?'多个入口，需人工定位':'未找到唯一可用入口';return record;}
    record.entry_label=candidates[0].label;
    // 只调用一次真实click；预检不会触发点击。超时只继续观察，不重试点击。
    record.stage='入口可点击性检查';
    await clickEntryAfterIntro(page,candidates[0].locator,record);
    record.stage='观察点击后的页面';
    for(let n=0;n<10;n++) {
      afterPage=popups.at(-1)??page;
      const snapshot=await observe(afterPage).catch(()=>null);
      if(snapshot) {
        after=snapshot.body;finalSignals={...snapshot.signals,blocked_navigation:blocked.length>0};
        record.state=classifyEntry(before,after,finalSignals);
        if(record.state!=='未确认后续流程，待复核')break;
      }
      await page.waitForTimeout(500);
    }
    if(!record.click_attempted)record.state='未能点击入口，待复核';
    if(record.state==='未确认后续流程，待复核'&&blocked.length)record.state='跳转超出已配置官网范围，待复核';
    record.signals=finalSignals;
    record.after_url=publicEntryUrl((afterPage??page).url());
    if(after&&!finalSignals.filled_fields) {
      await fs.writeFile(path.join(out,prefix+'-after.txt'),after);record.after_hash=sha256(after);
      record.after_screenshot_saved=await (afterPage??page).screenshot({path:path.join(out,prefix+'-after.png'),fullPage:false,timeout:5000}).then(()=>true,()=>false);
    }
    return record;
  } catch(error) {record.error_type=error.name??'Error';record.state='入口核验失败，待复核';return record;}
  finally {
    record.blocked_navigation_origins=[...new Set(blocked)];record.finished_at=new Date().toISOString();
    for(const popup of popups)await popup.close().catch(()=>{});
    await page?.close().catch(()=>{});
    await context.unroute('**/*',routeHandler).catch(()=>{});
    await fs.writeFile(path.join(out,prefix+'-entry.json'),JSON.stringify(record,null,2));
  }
}
export async function writeEntryReport(records,out) {
  await fs.writeFile(path.join(out,'entry-results.json'),JSON.stringify({metadata:{mode:'live-entry-probe',generated_at:new Date().toISOString(),note:'入口核验结果；未填写或提交申请。登录页不代表可申请或符合资格。'},records},null,2));
  await fs.writeFile(path.join(out,'entry-report.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ApplyCheck · 申请入口核验</title><style>body{font:16px/1.7 system-ui;background:#f3f5f8;color:#17243a;margin:32px auto;padding:0 20px;max-width:900px}article{background:white;padding:24px;border-radius:14px;margin:20px 0}h1{font-size:30px}strong{color:#215ec4}code{overflow-wrap:anywhere}</style><h1>申请入口核验</h1><p>最多点击一次入口，观察后续页面。未填写或提交申请；此结果不代表招聘资格匹配。</p>${records.map(r=>`<article><h2>${esc(r.title)}</h2><strong>${esc(r.state)}</strong><p>${esc(r.observed_at)} · ${esc(r.company)}</p><p>真实点击调用：${r.click_attempted?'已尝试':'未尝试'}；控件：${esc(r.entry_label??'未确定')}</p><p>点击后的公开地址：<code>${esc(r.after_url??'未取得')}</code></p><p>详情原文哈希：<code>${esc(r.before_hash??'未取得')}</code></p></article>`).join('')}</html>`);
}
