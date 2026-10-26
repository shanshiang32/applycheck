import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseMeituanCards,verifiedMeituanDetail} from '../lib/meituan.mjs';

test('真实美团列表识别十张卡片，其中五条日常实习',async()=>{
  const text=await fs.readFile(new URL('../examples/meituan-list-20261021.txt',import.meta.url),'utf8');
  const cards=parseMeituanCards(text);
  assert.equal(cards.length,10);assert.equal(cards.filter(c=>c.recruitment_type==='日常实习').length,5);
  assert.equal(cards[0].title,'AI全栈工程师');
  assert.equal(cards[5].title,'零售财务运营实习生');
  assert.equal(cards[5].city,'北京市');
});
test('顶部导航的日常实习不会被当成岗位标题',()=>{
  assert.deepEqual(parseMeituanCards('校园招聘\n日常实习\n转正实习'),[]);
});
test('缺少日期的卡片不猜作可点击岗位',()=>{
  assert.deepEqual(parseMeituanCards('全部校招职位（2）\n开发实习生\n日常实习\n北京'),[]);
});
test('详情必须是实际官网地址并出现目标标题与任职要求',()=>{
  const list='https://zhaopin.meituan.com/web/campus',hosts=['zhaopin.meituan.com'];
  const body='零售财务运营实习生\n任职要求\n本科及以上';
  assert.ok(verifiedMeituanDetail('https://zhaopin.meituan.com/web/position/detail/test',list,hosts,body,'零售财务运营实习生'));
  assert.ok(!verifiedMeituanDetail(list,list,hosts,body,'零售财务运营实习生'));
  assert.ok(!verifiedMeituanDetail('https://evil.example/detail',list,hosts,body,'零售财务运营实习生'));
});
test('仅岗位职责摘要不足以验证详情',()=>{
  assert.ok(!verifiedMeituanDetail('https://zhaopin.meituan.com/web/position/detail/test','https://zhaopin.meituan.com/web/campus',['zhaopin.meituan.com'],'零售财务运营实习生\n岗位职责','零售财务运营实习生'));
});

test('标题缺失时仍保留失败阶段与页面正文，不误报详情成功',async()=>{
  const {discoverMeituan}=await import('../lib/meituan.mjs');
  const {tmpdir}=await import('node:os');
  const path=await import('node:path');
  const out=await fs.mkdtemp(path.join(tmpdir(),'applycheck-diagnostic-'));
  const url='https://zhaopin.meituan.com/web/campus';
  const page={on(){},goto:async()=>({status:()=>200}),getByText:()=>({count:async()=>0}),
    waitForTimeout:async()=>{},url:()=>url,locator:()=>({innerText:async()=>'当前页面没有目标岗位'}),
    screenshot:async()=>{},close:async()=>{}};
  try {
    const result=await discoverMeituan({route:async()=>{},newPage:async()=>page},
      {url,allowed_hosts:['zhaopin.meituan.com'],company:'美团'},
      {body:'全部校招职位（1）\n测试实习生\n日常实习\n北京\n更新于2026/10/21'},out,1);
    assert.deepEqual(result,[]);
    const log=JSON.parse(await fs.readFile(path.join(out,'click-attempts.json'),'utf8'));
    assert.equal(log.attempts[0].stage,'等待目标标题');
    assert.equal(log.attempts[0].visible_title_matches,0);
    assert.equal(await fs.readFile(path.join(out,'click-01.txt'),'utf8'),'当前页面没有目标岗位');
  } finally {await fs.rm(out,{recursive:true,force:true});}
});

test('点击诊断只保留固定类别，不泄露异常里的连接参数',async()=>{
  const {clickFailureHints}=await import('../lib/meituan.mjs');
  const hints=clickFailureHints({message:'overlay intercepts pointer events; waiting for scheduled navigations; wss://secret.example/?token=PRIVATE'});
  assert.equal(hints.pointer_intercepted,true);
  assert.equal(hints.waiting_navigation,true);
  assert.ok(!JSON.stringify(hints).includes('PRIVATE'));
});
test('可点击性预检失败时不执行真实点击',async()=>{
  const {checkedTitleClick}=await import('../lib/meituan.mjs');
  const calls=[],attempt={};
  const title={click:async options=>{calls.push(options);throw Object.assign(new Error('intercepts pointer events'),{name:'TimeoutError'});}};
  await assert.rejects(()=>checkedTitleClick(title,attempt));
  assert.equal(calls.length,1);assert.equal(calls[0].trial,true);
  assert.equal(attempt.stage,'检查标题是否可点击');
  assert.equal(attempt.click_hints.pointer_intercepted,true);
});
test('真实点击超时后仍允许独立核验，且不重复点击',async()=>{
  const {checkedTitleClick}=await import('../lib/meituan.mjs');
  const calls=[],attempt={};
  const title={click:async options=>{calls.push(options);if(!options.trial)throw Object.assign(new Error('click action done; waiting for scheduled navigations'),{name:'TimeoutError'});}};
  await checkedTitleClick(title,attempt);
  assert.equal(calls.length,2);assert.equal(calls[1].noWaitAfter,true);
  assert.equal(attempt.actionability_passed,true);assert.equal(attempt.click_returned,false);
});
