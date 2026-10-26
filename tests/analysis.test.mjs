import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assess,extractRequirements,diffRecords,contentState} from '../lib/analyze.mjs';
import {allowedUrl} from '../lib/browser.mjs';
import {writeReport} from '../lib/report.mjs';

const undergraduate={is_student:true,degree:'本科',graduation_month:'2029-06',months_available:3,days_per_week:4};

test('明确学历、时长、出勤和毕业区间，四项边界均匹配',()=>{
  const r=assess('任职要求：本科及以上。实习至少3个月。每周至少4天。面向2028年9月-2029年8月期间毕业的同学。',undergraduate);
  assert.equal(r.status,'已识别的硬条件匹配');assert.equal(r.checks.length,4);
  assert.equal(r.review_required,true);
});
test('本科不满足硕士及以上，不会被其他匹配项覆盖',()=>{
  const r=assess('硕士及以上学历。实习至少3个月。每周至少4天。',undergraduate);
  assert.equal(r.status,'明确条件不匹配');
  assert.equal(r.checks.find(x=>x.field==='min_degree').result,'fail');
});
test('优先项不当成硬门槛',()=>{
  const r=assess('实习6个月以上优先。硕士及以上优先。',undergraduate);
  assert.equal(r.status,'信息不足，待复核');assert.ok(r.checks.every(x=>x.strength==='preferred'));
});
test('未知用户条件不自动判为符合',()=>{
  const r=assess('实习至少3个月。',{});
  assert.equal(r.checks[0].result,'unknown');assert.equal(r.status,'信息不足，待复核');
});
test('日期里的月份不会变成实习时长',()=>{
  const fields=extractRequirements('日常实习：面向2027年9月-2028年8月期间毕业的学生，为期3个月及以上。');
  assert.deepEqual(fields.filter(x=>x.field==='min_months').map(x=>x.value),[3]);
});
test('两位数实习时长不会截断为个位数',()=>{
  const r=assess('实习至少12个月。',undergraduate);
  assert.equal(r.checks[0].value,12);assert.equal(r.checks[0].result,'fail');
});
test('工资发放条件不会识别为实习时长',()=>{
  assert.equal(extractRequirements('实习工资满3个月以上发放。').length,0);
});
test('只写某届或模糊时长时不猜条件',()=>{
  const r=assess('面向2027届。实习3-6个月。',undergraduate);
  assert.equal(r.status,'信息不足，待复核');assert.equal(r.checks.length,0);
});
test('读取失败与明确关闭区分',()=>{
  assert.equal(contentState('',503),'访问失败');
  assert.equal(contentState('该职位不存在',200),'页面明确显示关闭');
});
test('未再次采集到的岗位不误判下架',()=>{
  const result=diffRecords([{url:'https://example.com/a',title:'A'}],[]);
  assert.match(result[0].change,/不能据此判为下架/);
});
test('只允许配置的 HTTPS 官网',()=>{
  assert.equal(allowedUrl('https://jobs.bytedance.com/campus', ['jobs.bytedance.com']),true);
  for(const url of ['http://jobs.bytedance.com','https://jobs.bytedance.com.evil.example','https://secret@jobs.bytedance.com','javascript:alert(1)'])assert.equal(allowedUrl(url,['jobs.bytedance.com']),false);
});
test('报告转义网页文本，CSV 防公式执行',async()=>{
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'applycheck-'));
  try {
    await writeReport([{company:'=1+1',title:'<script>alert(1)</script>',url:'javascript:alert(1)',assessment:{checks:[],missing:[],scope:''}}],out,{mode:'synthetic'});
    const html=await fs.readFile(path.join(out,'report.html'),'utf8');
    assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('href="#"'));assert.match(await fs.readFile(path.join(out,'results.csv'),'utf8'),/'=1\+1/);
  } finally {await fs.rm(out,{recursive:true,force:true});}
});
