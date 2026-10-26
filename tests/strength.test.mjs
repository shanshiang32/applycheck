import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {extractRequirements,assess,sha256} from '../lib/analyze.mjs';
import {normalizeRecord} from '../lib/normalize.mjs';

test('专业优先不能降低同句学历硬门槛',()=>{
  const r=extractRequirements('本科及以上学历在读，计算机相关专业优先');
  assert.equal(r[0].strength,'hard');
  assert.equal(r[0].evidence_clause,'本科及以上学历在读');
});
test('出勤天数与时长优先项按子句分别判断',()=>{
  const r=extractRequirements('能保证每周出勤4天及以上，连续实习4个月及以上者优先，可长期实习者加分');
  assert.equal(r.find(x=>x.field==='min_days').strength,'hard');
  assert.equal(r.find(x=>x.field==='min_months').strength,'preferred');
});
test('英文逗号同样分开学历与专业优先项',()=>{
  assert.equal(extractRequirements('本科及以上,计算机专业优先')[0].strength,'hard');
});
test('加分项标题下的数字条件保留为偏好',()=>{
  const r=extractRequirements('加分项：\n实习至少6个月。\n任职要求\n本科及以上。');
  assert.equal(r.find(x=>x.field==='min_months').strength,'preferred');
  assert.equal(r.find(x=>x.field==='min_degree').strength,'hard');
});
test('学历本身带优先时仍为优先项',()=>{
  assert.equal(extractRequirements('硕士及以上学历优先，专业不限')[0].strength,'preferred');
});
test('实际批次五份原文：标题与哈希保留，三条学历从偏好修正为硬条件',async()=>{
  const d=JSON.parse(await fs.readFile(new URL('../examples/batch-01-20261020.json',import.meta.url),'utf8'));
  assert.equal(d.records.length,5);
  for(const old of d.records){
    const row=normalizeRecord(old);
    assert.equal(sha256(row.body),old.body_hash);
    assert.equal(row.title,old.title);
    const a=assess(row.job_body,{});
    assert.equal(a.checks.find(c=>c.field==='min_degree').strength,'hard');
  }
});
test('真实策略产品岗位：四天出勤不被后文优先覆盖',async()=>{
  const d=JSON.parse(await fs.readFile(new URL('../examples/batch-01-20261020.json',import.meta.url),'utf8'));
  const row=normalizeRecord(d.records[1]);
  const a=assess(row.job_body,{degree:'本科',months_available:3,days_per_week:3});
  assert.equal(a.status,'明确条件不匹配');
  assert.equal(a.checks.find(c=>c.field==='min_days').result,'fail');
  assert.equal(a.checks.find(c=>c.field==='min_months'&&c.value===4).strength,'preferred');
});
