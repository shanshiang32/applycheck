import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {extractRequirements,assess,sha256} from '../lib/analyze.mjs';
const profile={degree:'硕士',graduation_year:2025,is_student:false,months_available:6,days_per_week:5};

test('真实美团HR：保留原文哈希，2025届被2028及以后门槛明确排除',async()=>{
 const fixture=JSON.parse(await fs.readFile(new URL('../examples/meituan-batch-20261021.json',import.meta.url),'utf8'));
 for(const r of fixture.records)assert.equal(sha256(r.body),r.body_hash);
 const hr=fixture.records.find(r=>r.title==='HR实习生（招聘方向）');
 const result=assess(hr.body,profile);
 assert.equal(result.status,'明确条件不匹配');
 assert.equal(result.checks.find(c=>c.field==='graduation_min_year').value,2028);
 assert.equal(result.checks.find(c=>c.field==='graduation_min_year').result,'fail');
 assert.equal(result.checks.find(c=>c.field==='min_days').value,4);
 assert.equal(result.checks.find(c=>c.field==='min_degree').value,'本科');
 assert.equal(assess(hr.body,{...profile,graduation_year:2028,days_per_week:4}).checks.find(c=>c.field==='min_days').result,'pass');
});
test('毕业年份下界相等通过，小于失败，未知保持未知',()=>{
 const text='2028届及以后的本科或研究生';
 for(const [year,result] of [[2027,'fail'],[2028,'pass'],[2029,'pass'],[null,'unknown']])
 assert.equal(assess(text,{...profile,graduation_year:year}).checks.find(c=>c.field==='graduation_min_year').result,result);
 assert.equal(assess(text,{...profile,graduation_year:null,graduation_month:'2028-07'}).checks.find(c=>c.field==='graduation_min_year').result,'pass');
});
test('届别优先条件不升级为硬排除，不把无语境数字或单独届别猜作下界',()=>{
 const check=assess('28届及以后的本科生优先',profile).checks.find(c=>c.field==='graduation_min_year');
 assert.equal(check.strength,'preferred');assert.equal(check.result,'preference_gap');
 for(const text of ['2028届本科生','第28届及以后活动','2028年更新'])assert.ok(!extractRequirements(text).some(c=>c.field==='graduation_min_year'));
});
test('出勤范围取下界，偏好仍为偏好，三天不足，倒置范围不猜',()=>{
 for(const sep of ['-','—','～','至']) {
  const check=assess(`每周出勤4${sep}5天`,{...profile,days_per_week:3}).checks.find(c=>c.field==='min_days');
  assert.equal(check.value,4);assert.equal(check.result,'fail');
 }
 assert.equal(extractRequirements('每周4-5天优先').find(c=>c.field==='min_days').strength,'preferred');
 assert.ok(!extractRequirements('每周5-4天').some(c=>c.field==='min_days'));
});
