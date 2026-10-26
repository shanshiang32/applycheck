import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {knownIntroText,dismissKnownIntro,clickEntryAfterIntro} from '../lib/entry.mjs';
const intro='你的\nAI 求职搭子来了\n个性化荐岗\n稍后再说\n立即体验';
function mockPage({late=false,ambiguous=false,host='jobs.bytedance.com'}={}) {
 let visible=!late,attempts=0,closes=0,entries=0;
 const close={isVisible:async()=>visible,click:async()=>{closes++;visible=false;}};
 const page={url:()=>`https://${host}/campus/position/1/detail`,locator:()=>({innerText:async()=>visible?intro:'岗位详情'}),
 getByText:()=>({count:async()=>ambiguous?2:1,nth:()=>close})};
 const entry={click:async options=>{
  if(options.trial){attempts++;if(late&&attempts===1)visible=true;
   if(visible)throw Object.assign(new Error('modal intercepts pointer events'),{name:'TimeoutError'});
  }else entries++;
 }};
 return {page,entry,stats:()=>({attempts,closes,entries})};
}
test('真实截图配套正文可确认已知介绍窗，只有同名关闭文字不足以确认',async()=>{
 const text=await fs.readFile(new URL('../examples/bytedance-intro-20261021.txt',import.meta.url),'utf8');
 assert.equal(knownIntroText(text),true);assert.equal(knownIntroText('稍后再说 立即体验'),false);
});
test('先关闭已知介绍窗，再真实点击一次投递，避免进入立即体验',async()=>{
 const m=mockPage(),record={click_attempted:false};
 await clickEntryAfterIntro(m.page,m.entry,record);
 assert.deepEqual(m.stats(),{attempts:1,closes:1,entries:1});
 assert.equal(record.ui_actions[0].label,'稍后再说');assert.equal(record.ui_actions[0].completed,true);
});
test('延迟介绍窗导致预检失败后可重新预检，但真实投递仍只有一次',async()=>{
 const m=mockPage({late:true}),record={click_attempted:false};
 await clickEntryAfterIntro(m.page,m.entry,record);
 assert.deepEqual(m.stats(),{attempts:2,closes:1,entries:1});
 assert.equal(record.preflight_attempts[0].click_hints.pointer_intercepted,true);
});
test('关闭控件不唯一或域名不符时不点击',async()=>{
 for(const options of [{ambiguous:true},{host:'other.example'}]) {
  const m=mockPage(options),actions=[];
  assert.equal(await dismissKnownIntro(m.page,actions),false);assert.equal(m.stats().closes,0);
 }
});
test('已尝试关闭的介绍窗不重复关闭',async()=>{
 const m=mockPage(),actions=[{action:'dismiss_known_intro',completed:false}];
 assert.equal(await dismissKnownIntro(m.page,actions),false);assert.equal(m.stats().closes,0);
});
