import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assess,extractRequirements} from '../lib/analyze.mjs';
import {normalizeRecord} from '../lib/normalize.mjs';

test('已毕业者学历达标仍不满足在读要求',()=>{
  const a=assess('本科及以上学历在读，专业不限',{degree:'硕士',is_student:false});
  assert.equal(a.checks.find(x=>x.field==='min_degree').result,'pass');
  assert.equal(a.checks.find(x=>x.field==='requires_student').result,'fail');
  assert.equal(a.status,'明确条件不匹配');
});
test('在校状态未知时不能因学历推测在读',()=>{
  const a=assess('面向全体在校生',{degree:'硕士'});
  assert.equal(a.checks.find(x=>x.field==='requires_student').result,'unknown');
});
test('仅知2025年也可确定不在2026至2027毕业区间',()=>{
  const a=assess('面向2026年9月-2027年8月期间毕业的同学',{graduation_year:2025});
  assert.equal(a.checks[0].result,'fail');assert.equal(a.checks[0].precision,'year');
});
test('毕业年与区间部分重叠时不猜月份',()=>{
  const a=assess('2026年9月-2027年8月期间毕业',{graduation_year:2027});
  assert.equal(a.checks[0].result,'unknown');
});
test('毕业年全部处于范围内时可判匹配',()=>{
  const a=assess('2026年1月-2027年12月期间毕业',{graduation_year:2027});
  assert.equal(a.checks[0].result,'pass');
});
test('在校生优先不等于必须在校',()=>{
  const a=assess('在校生优先',{is_student:false});
  assert.equal(a.checks[0].strength,'preferred');assert.equal(a.checks[0].result,'preference_gap');
});
test('不限在校生不识别为在校硬条件',()=>{
  assert.equal(extractRequirements('不限在校生').length,0);
});
test('真实五岗位在2025年已毕业画像下均触发明确条件不匹配',async()=>{
  const data=JSON.parse(await fs.readFile(new URL('../examples/batch-01-20261020.json',import.meta.url),'utf8'));
  const profile=JSON.parse(await fs.readFile(new URL('../config/profile-graduated-2025.json',import.meta.url),'utf8'));
  for(const [i,row] of data.records.entries()){
    const a=assess(normalizeRecord(row).job_body,profile);
    assert.equal(a.status,'明确条件不匹配');
    assert.ok(a.checks.some(x=>x.field==='requires_student'&&x.result==='fail'));
    if(i>=3)assert.ok(a.checks.some(x=>x.field==='graduation_range'&&x.result==='fail'));
  }
});
