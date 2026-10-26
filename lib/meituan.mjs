import fs from 'node:fs/promises';
import path from 'node:path';
import {allowedUrl} from './browser.mjs';

// 根据实测公开页面：标题 -> 可选“稀缺” -> 招聘类型 -> 城市 -> 更新于日期。
export function parseMeituanCards(text) {
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const start=lines.findIndex(x=>/^全部校招职位[（(]/.test(x));
  if(start<0)return [];
  const cards=[];
  for(let i=start+1;i<lines.length;i++) {
    if(!/^更新于\d{4}[/-]\d{2}[/-]\d{2}$/.test(lines[i]))continue;
    let typeIndex=-1;
    for(let j=i-1;j>=Math.max(start+1,i-5);j--) {
      if(/^(应届|应届生|日常实习|转正实习)$/.test(lines[j])){typeIndex=j;break;}
    }
    if(typeIndex<0)continue;
    let titleIndex=typeIndex-1;
    while(titleIndex>start&&/^(稀缺|急招|热门|置顶)$/.test(lines[titleIndex]))titleIndex--;
    const title=lines[titleIndex];
    if(!title||title.length<3||title.length>150||/^(岗位职责|职位描述|任职要求)$/.test(title))continue;
    cards.push({title,recruitment_type:lines[typeIndex],city:lines.slice(typeIndex+1,i).join('、'),updated:lines[i].slice(3)});
  }
  return cards.filter((c,i,a)=>a.findIndex(x=>x.title===c.title&&x.city===c.city)===i);
}

export function verifiedMeituanDetail(url,listUrl,hosts,text,title) {
  if(!allowedUrl(url,hosts)||url===listUrl)return false;
  return text.includes(title)&&/(任职要求|岗位(?:基本)?要求|任职资格|职位要求)/.test(text);
}

// 仅提取固定诊断类别，绝不保存异常原文、URL 或连接参数。
export function clickFailureHints(error) {
  const message=String(error?.message??'');
  return {
    pointer_intercepted:/intercepts pointer events/i.test(message),
    element_unstable:/element is not stable/i.test(message),
    outside_viewport:/outside of the viewport|not in the viewport/i.test(message),
    element_detached:/detached|not attached/i.test(message),
    waiting_navigation:/waiting for.*navigation|scheduled navigations/i.test(message),
    click_dispatched:/click action done/i.test(message),
    page_closed:/target.*closed|page.*closed/i.test(message)
  };
}

export async function checkedTitleClick(title,attempt) {
  attempt.stage='检查标题是否可点击';
  try {await title.click({trial:true,timeout:8000});}
  catch(error){attempt.click_hints=clickFailureHints(error);throw error;}
  attempt.actionability_passed=true;
  attempt.stage='点击目标标题';
  try {
    // 页面结果由后面的独立核验负责，避免点击内部等待导航阻塞采集。
    await title.click({timeout:10000,noWaitAfter:true});
    attempt.click_returned=true;
  } catch(error) {
    attempt.click_error_type=error.name??'Error';
    attempt.click_hints=clickFailureHints(error);
    if(error.name!=='TimeoutError')throw error;
    // 超时并不能证明没有触发点击。只观察一次结果，不重复点击。
    attempt.click_returned=false;
  }
}

export async function discoverMeituan(context,site,initialRecord,out,limit=3,sessionId=null) {
  const candidates=parseMeituanCards(initialRecord.body).filter(c=>/实习/.test(c.recruitment_type)).slice(0,limit);
  const attempts=[],targets=[];
  // 新弹出的页面也使用导航范围限制。只点击已经在列表观察到的岗位标题。
  await context.route('**/*',async route=>{
    const req=route.request();
    if(req.isNavigationRequest()&&!allowedUrl(req.url(),site.allowed_hosts))return route.abort();
    return route.continue();
  });
  for(const [i,card]of candidates.entries()) {
    const name='click-'+String(i+1).padStart(2,'0');
    const attempt={...card,session_id:sessionId,observed_at:new Date().toISOString(),action:'点击列表实习岗位标题',state:'尚未完成',stage:'创建页面'};
    let page,detail;const popups=[];
    try {
      page=await context.newPage();
      page.on('popup',p=>popups.push(p));
      attempt.stage='加载列表';
      const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:45000});
      attempt.http_status=response?.status()??null;
      attempt.stage='等待目标标题';
      const matches=page.getByText(card.title,{exact:true});
      let title=null;
      for(let tick=0;tick<40;tick++) {
        const count=await matches.count();
        const visible=[];
        for(let n=0;n<count;n++)if(await matches.nth(n).isVisible())visible.push(matches.nth(n));
        attempt.title_matches=count;attempt.visible_title_matches=visible.length;
        if(visible.length>1)throw new Error('ambiguous_title');
        if(visible.length===1){title=visible[0];break;}
        await page.waitForTimeout(750);
      }
      if(!title)throw new Error('title_not_visible');
      attempt.stage='保存点击前现场';
      const before=await page.locator('body').innerText({timeout:5000});
      await fs.writeFile(path.join(out,name+'-before.txt'),before);
      attempt.before_body_saved=true;
      attempt.before_screenshot_saved=await page.screenshot({path:path.join(out,name+'-before.png'),fullPage:false,timeout:5000}).then(()=>true,()=>false);
      await checkedTitleClick(title,attempt);
      attempt.stage='验证详情内容';
      let verified=false,text='';
      for(let tick=0;tick<24;tick++) {
        detail=popups.at(-1)??page;
        text=await detail.locator('body').innerText({timeout:3000}).catch(()=>'');
        if(verifiedMeituanDetail(detail.url(),site.url,site.allowed_hosts,text,card.title)){verified=true;break;}
        await page.waitForTimeout(500);
      }
      detail=popups.at(-1)??page;
      const observedUrl=detail.url();
      attempt.final_url=allowedUrl(observedUrl,site.allowed_hosts)?observedUrl:null;
      attempt.state=verified?'已核验独立详情地址':'未取得可核验的独立详情地址';
      attempt.body_characters=text.length;
      await fs.writeFile(path.join(out,name+'.txt'),text);
      await detail.screenshot({path:path.join(out,name+'.png'),fullPage:true,timeout:10000}).catch(()=>{});
      if(verified)targets.push({company:site.company,title:card.title,url:observedUrl,allowed_hosts:site.allowed_hosts,
        recruitment_type:card.recruitment_type,provenance:'Lexmount 云端实际点击岗位标题后取得的详情地址',discovery_session_id:sessionId});
    } catch(error) {
      attempt.state=error.message==='ambiguous_title'?'同名标题不唯一，需人工定位':'点击或等待详情失败';
      attempt.error_type=error.name??'Error';
      if(error.message==='title_not_visible')attempt.state='列表中未找到唯一可见的目标标题';
      // 不记录底层错误消息，以免包含带凭据的连接 URL。
    } finally {
      // 异常路径也保存现场。
      const observed=popups.at(-1)??page;
      if(observed) {
        const url=observed.url();
        attempt.final_url=allowedUrl(url,site.allowed_hosts)?url:null;
        const body=await observed.locator('body').innerText({timeout:5000}).catch(()=>null);
        if(body!==null) {
          attempt.body_characters=body.length;
          attempt.observed_cards=parseMeituanCards(body);
          await fs.writeFile(path.join(out,name+'.txt'),body);
        }
        attempt.screenshot_saved=await observed.screenshot({path:path.join(out,name+'.png'),fullPage:true,timeout:10000}).then(()=>true,()=>false);
      }
      attempt.finished_at=new Date().toISOString();
      for(const popup of popups)await popup.close().catch(()=>{});
      await page?.close().catch(()=>{});
    }
    attempts.push(attempt);
    await fs.writeFile(path.join(out,'click-attempts.json'),JSON.stringify({candidates,attempts,targets},null,2));
    console.log(`美团点击 ${i+1}/${candidates.length} ${card.title}：${attempt.state}`);
  }
  const unique=[...new Map(targets.map(t=>[t.url,t])).values()];
  await fs.writeFile(path.join(out,'click-attempts.json'),JSON.stringify({candidates,attempts,targets:unique},null,2));
  return unique;
}
