import fs from 'node:fs/promises';
import path from 'node:path';
import {sha256, contentState} from './analyze.mjs';
import {normalizeRecord} from './normalize.mjs';

export function allowedUrl(url, hosts) {
  try { const u=new URL(url); return u.protocol==='https:' && hosts.includes(u.hostname) && !u.username && !u.password; }
  catch { return false; }
}

export async function cloudSession(task) {
  if(!process.env.LEXMOUNT_API_KEY || !process.env.LEXMOUNT_PROJECT_ID) throw new Error('缺少 Lexmount 凭据。请在本地 .env 配置 API Key 和 Project ID，不要粘贴到聊天中。');
  const [{Lexmount},{chromium}]=await Promise.all([import('lexmount'),import('playwright')]);
  const client=new Lexmount();
  let session,browser;
  try {
    session=await client.sessions.create({browserMode:'normal', downloads:{enabled:false},recording:{persistent:true}});
    if(!session.connectUrl) throw new Error('云端会话没有提供连接地址');
    browser=await chromium.connectOverCDP(session.connectUrl);
    const context=browser.contexts()[0];
    if(!context) throw new Error('没有可用的默认浏览器上下文');
    // 使用新建、无登录态的会话，不加载个人账号。
    return await task({context,sessionId:session.id??session.sessionId??null});
  } finally {
    // 各关闭动作独立尝试，不能因为断开连接失败而跳过云端会话清理。
    try { await browser?.close(); } catch { console.error('浏览器连接关闭失败，请检查控制台。'); }
    try { await session?.close(); } catch { console.error('云端会话关闭失败，请到控制台核对并结束会话。'); }
    try { client.close(); } catch { console.error('SDK 客户端清理失败。'); }
  }
}

export async function capture(context, target, dir, index, sessionId, detail=true) {
  const page=await context.newPage();
  const prefix=String(index).padStart(3,'0');
  const started=Date.now();
  const observedAt=new Date().toISOString();
  const log=[];
  // 仅允许目标官网与其静态资源。页面导航越过官网范围时直接阻断。
  await page.route('**/*',async route=>{
    const req=route.request();
    if(req.isNavigationRequest() && !allowedUrl(req.url(), target.allowed_hosts)) return route.abort();
    return route.continue();
  });
  let body='',httpStatus=null,title=target.title??target.company,finalUrl=target.url;
  let links=[],entry=[],headingCandidates=[];
  let state='访问失败';
  try {
    if(!allowedUrl(target.url,target.allowed_hosts)) throw new Error('目标 URL 不在官网允许范围');
    const response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:45000});
    httpStatus=response?.status()??null;
    log.push({action:'navigate',url:target.url,http_status:httpStatus});
    await page.locator('body').waitFor({state:'visible',timeout:15000});
    // 等待动态内容稳定；不把 networkidle 作为成功依据。
    let previous='',stable=0;
    for(let n=0;n<12;n++) {
      const current=await page.locator('body').innerText({timeout:5000});
      stable=current===previous?stable+1:0;previous=current;
      if(current.length>300 && stable>=2)break;
      await page.waitForTimeout(750);
    }
    const main=page.locator('main');
    body=await (await main.count()===1?main:page.locator('body')).innerText({timeout:10000});
    const headingRoot=await main.count()===1?main:page.locator('body');
    headingCandidates=await headingRoot.locator('h1,h2').allTextContents();
    title=target.title||await page.title();
    finalUrl=page.url();
    links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(a=>({title:a.innerText.trim(),url:a.href})).filter(x=>x.title));
    entry=await page.locator('a,button,[role="button"]').evaluateAll(nodes=>nodes.filter(n=>/^(立即投递|投递简历|申请职位|立即申请|投递|Apply|Apply now)$/i.test(n.innerText.trim())).map(n=>({text:n.innerText.trim(),href:n.href??null,disabled:n.disabled===true||n.getAttribute('aria-disabled')==='true',visible:!!(n.offsetWidth||n.offsetHeight||n.getClientRects().length)})).filter(n=>n.visible));
    state=contentState(body,httpStatus,detail);
    await page.screenshot({path:path.join(dir,prefix+'.png'),fullPage:true,timeout:15000});
    log.push({action:'observe',state,entry_controls:entry.length,body_characters:body.length});
  } catch(error) {
    // 不保存异常原文，底层 SDK/网络异常可能含带凭据的连接 URL。
    log.push({action:'error',type:error.name??'Error',message:'页面采集未完成，请通过会话控制台排查。'});
    state='访问失败';
  } finally { await page.close().catch(()=>{}); }
  const record=normalizeRecord({
    company:target.company,title,url:target.url,final_url:finalUrl,
    observed_at:observedAt,provider:'lexmount-cloud',session_id:sessionId,
    http_status:httpStatus,content_state:state,body,body_hash:sha256(body),
    entry_controls:entry,entry_state:entry.length?'发现可见入口，尚未验证后续流程':'未观察到入口，不能据此判为不可投',
    elapsed_ms:Date.now()-started,trace:log,evidence_prefix:prefix,
    target_title:target.title??null,heading_candidates:headingCandidates.map(s=>s.trim()).filter(Boolean)
  });
  await fs.writeFile(path.join(dir,prefix+'.txt'),body);
  await fs.writeFile(path.join(dir,prefix+'.json'),JSON.stringify(record,null,2));
  return {record,links};
}
