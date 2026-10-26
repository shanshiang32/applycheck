import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {normalizeRecord} from '../lib/normalize.mjs';
import {assess,sha256} from '../lib/analyze.mjs';

const fixture=new URL('../examples/first-live-20261020.json',import.meta.url);
test('真实采集回归：标题来自当前岗位而非 H1 导航',async()=>{
  const raw=JSON.parse(await fs.readFile(fixture,'utf8'));
  const r=normalizeRecord(raw);
  assert.equal(r.title,'通用Agent评测运营实习生 - AI数据与安全');
  assert.equal(r.title_verified,true);assert.equal(r.title_source,'bytedance_detail_header');
  assert.equal(r.body,raw.body);assert.equal(r.body_hash,raw.body_hash);
  assert.equal(sha256(r.body),raw.body_hash);
  assert.ok(!r.job_body.includes('相关职位'));
  assert.ok(r.job_body.includes('每周实习5天'));
});
test('相关职位里的学历要求不影响当前岗位',()=>{
  const body='开发实习生-测试团队\n北京\n实习\n职位 ID：A1\n职位要求\n本科及以上学历。\n相关职位\n研究员\n博士及以上学历。';
  const r=normalizeRecord({body,title:'校招',url:'https://jobs.bytedance.com/campus/position/123/detail'});
  const a=assess(r.job_body,{degree:'本科'});
  assert.ok(!a.checks.some(c=>c.result==='fail'));assert.equal(a.checks.length,1);
});
test('没有详情结构时不把正文首句猜作岗位标题',()=>{
  const r=normalizeRecord({body:'欢迎来到校园招聘\n请先登录',title:'校招',url:'https://jobs.bytedance.com/campus/login'});
  assert.equal(r.title_verified,false);assert.equal(r.title,'岗位名称待核验');
});
test('真实正文识别本科、三个月和每周五天',async()=>{
  const raw=JSON.parse(await fs.readFile(fixture,'utf8'));
  const r=normalizeRecord(raw);
  const a=assess(r.job_body,{degree:'本科',months_available:3,days_per_week:4});
  assert.equal(a.checks.find(c=>c.field==='min_days').value,5);
  assert.equal(a.checks.find(c=>c.field==='min_days').result,'fail');
  assert.equal(a.status,'明确条件不匹配');
  assert.equal(a.checks.find(c=>c.field==='min_degree').value,'本科');
});
