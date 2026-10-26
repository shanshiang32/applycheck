import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assess,extractRequirements,sha256} from '../lib/analyze.mjs';

test('真实第三批：不短于4个月保留为硬下界，首次错误样本不被覆盖',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../examples/batch-03-frozen-20261021.json',import.meta.url),'utf8'));
 const row=data.records[0];assert.equal(sha256(row.body),row.body_hash);
 const frozen=row.assessment.checks.filter(c=>c.field==='min_months').map(c=>c.value);
 assert.deepEqual(frozen,[3]);
 const current=extractRequirements(row.job_body).filter(c=>c.field==='min_months');
 assert.deepEqual(current.map(c=>c.value),[3,4]);
 assert.equal(current[1].strength,'hard');assert.equal(current[1].evidence_clause,'实习期不短于4个月');
});
test('时长下界3个月失败、4个月与6个月通过，未知仍未知',()=>{
 const text='实习期不短于4个月';
 for(const [months,result] of [[3,'fail'],[4,'pass'],[6,'pass'],[null,'unknown']]) {
  const checks=assess(text,{months_available:months}).checks;
  assert.equal(checks.find(c=>c.field==='min_months').result,result);
 }
});
test('不短于的优先项、两位数字和工资语境正确区分',()=>{
 assert.equal(extractRequirements('实习不短于12个月')[0].value,12);
 assert.equal(extractRequirements('实习期不短于4个月优先')[0].strength,'preferred');
 assert.ok(!extractRequirements('工资发放期不短于4个月').some(c=>c.field==='min_months'));
 assert.ok(!extractRequirements('实习期2026年4月起').some(c=>c.field==='min_months'));
});
