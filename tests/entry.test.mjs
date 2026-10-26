import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {classifyEntry,publicEntryUrl,verifyEntry,writeEntryReport} from '../lib/entry.mjs';

test('导航栏登录字样和正文变化都不能证明进入登录流程',()=>{
 assert.equal(classifyEntry('首页 登录 职位要求','首页 登录 职位要求 内容更新'),'未确认后续流程，待复核');
 assert.equal(classifyEntry('扫码登录 帮助','扫码登录 帮助 更新'),'未确认后续流程，待复核');
});
test('新增登录提示或可见认证输入框可识别为需要登录',()=>{
 assert.equal(classifyEntry('岗位详情','岗位详情 请先登录'),'需要登录');
 assert.equal(classifyEntry('详情','登录',{phone_input:true}),'需要登录');
 assert.equal(classifyEntry('详情','账号密码',{password_input:true}),'需要登录');
});
test('申请表单、已填写字段和越域导航分别保留状态',()=>{
 assert.equal(classifyEntry('详情','上传简历',{file_input:true}),'已进入申请表单，未填写或提交');
 assert.equal(classifyEntry('详情','上传简历',{file_input:true,filled_fields:true}),'检测到已填写字段，停止核验');
 assert.equal(classifyEntry('详情','',{blocked_navigation:true}),'跳转超出已配置官网范围，待复核');
});
test('公开后续地址移除授权查询、片段和非HTTPS凭据地址',()=>{
 assert.equal(publicEntryUrl('https://jobs.bytedance.com/login?token=secret&state=private#secret'),'https://jobs.bytedance.com/login');
 assert.equal(publicEntryUrl('https://u:p@jobs.bytedance.com/login'),null);
 assert.equal(publicEntryUrl('http://jobs.bytedance.com/login'),null);
});

async function mockProbe({valid=true,timeout=false}={}) {
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'applycheck-entry-'));
 let clicked=false,actualClicks=0,closed=false;
 const before='测试岗位\n职位要求\n本科及以上学历\n投递';
 const title={isVisible:async()=>true,isEnabled:async()=>true,innerText:async()=>'投递',click:async options=>{
   if(options.trial)return;
   actualClicks++;if(timeout)throw Object.assign(new Error('timeout'),{name:'TimeoutError'});
   clicked=true;
 }};
 const page={on(){},goto:async()=>({status:()=>200}),waitForTimeout:async()=>{},url:()=> 'https://jobs.bytedance.com/login?state=REMOVE',
   screenshot:async()=>{},close:async()=>{closed=true;},
   locator:selector=>selector==='body'?{innerText:async()=>valid?(clicked?'请先登录 账号密码':before):'其他页面'}:
     selector==='input,textarea,select'?{evaluateAll:async()=>clicked?[{type:'password',hint:'',filled:false}]:[]}:
     {count:async()=>1,nth:()=>title}};
 const context={route:async()=>{},unroute:async()=>{},newPage:async()=>page};
 const target={company:'测试',title:'测试岗位',url:'https://jobs.bytedance.com/campus/position/1/detail',allowed_hosts:['jobs.bytedance.com']};
 try {
   const record=await verifyEntry(context,target,out,1,'synthetic-session');
   const saved=JSON.parse(await fs.readFile(path.join(out,'001-entry.json'),'utf8'));
   assert.equal(saved.state,record.state);assert.equal(closed,true);
   return {record,actualClicks};
 } finally {await fs.rm(out,{recursive:true,force:true});}
}
test('入口探测只真实点击一次，停在登录页并保存证据记录',async()=>{
 const {record,actualClicks}=await mockProbe();
 assert.equal(record.state,'需要登录');assert.equal(actualClicks,1);
 assert.ok(record.before_hash&&record.after_hash);
 assert.equal(record.after_url,'https://jobs.bytedance.com/login');
});
test('点击超时不重复点击，结果维持待复核',async()=>{
 const {record,actualClicks}=await mockProbe({timeout:true});
 assert.equal(actualClicks,1);assert.equal(record.state,'未确认后续流程，待复核');
});
test('无法确认目标详情时不会点击，记录保留',async()=>{
 const {record,actualClicks}=await mockProbe({valid:false});
 assert.equal(actualClicks,0);assert.equal(record.state,'未确认目标详情，未点击');
});
test('入口报告转义不可信网页标题',async()=>{
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'applycheck-entry-report-'));
 try {
  await writeEntryReport([{title:'<script>alert(1)</script>',state:'需要登录'}],out);
  const html=await fs.readFile(path.join(out,'entry-report.html'),'utf8');
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 } finally {await fs.rm(out,{recursive:true,force:true});}
});
