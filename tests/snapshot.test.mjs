import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalizeRecord} from '../lib/normalize.mjs';
import {assess,diffRecords,sha256} from '../lib/analyze.mjs';
const profile={degree:'硕士',graduation_year:2025,is_student:false,months_available:6,days_per_week:5};
async function records(name) {
 const data=JSON.parse(await fs.readFile(new URL('../examples/'+name,import.meta.url),'utf8'));
 return data.records.map(r=>{const n=normalizeRecord(r);n.assessment=assess(n.job_body,profile);return n;});
}
test('真实隔日五岗：相关职位变化全部识别为附属内容变化，岗位正文和判断保持一致',async()=>{
 const before=await records('batch-01-20261020.json'),after=await records('snapshot-repeat-20261021.json');
 assert.equal(before.length,5);assert.equal(after.length,5);
 const diff=diffRecords(before,after);assert.equal(diff.length,5);
 for(const row of diff){assert.equal(row.text_change_type,'auxiliary_only');assert.equal(row.change,'页面附属内容改变，岗位正文未变');}
 for(const r of after){assert.equal(sha256(r.body),r.body_hash);assert.equal(r.assessment.status,'明确条件不匹配');}
});
const sample=body=>{const r=normalizeRecord({url:'https://example.com/job',body,body_hash:sha256(body),content_state:'已读取详情'});r.assessment=assess(r.job_body,profile);return r;};
test('实际岗位要求改变时不会被附属内容分类吞掉',()=>{
 const result=diffRecords([sample('本科及以上\n每周出勤4天\n相关职位\n推荐A')],[sample('本科及以上\n每周出勤5天\n相关职位\n推荐B')]);
 assert.equal(result[0].text_change_type,'job_body_changed');
});
test('缺少岗位正文、哈希不符或提取版本变化不能断言只是附属内容变更',()=>{
 const old=sample('本科及以上\n相关职位\n推荐A');
 for(const mutation of [{job_body:null},{job_body_hash:'bad'},{normalization_version:'other'},{content_state:'访问失败'}]) {
  const row={...sample('本科及以上\n相关职位\n推荐B'),...mutation};
  assert.equal(diffRecords([old],[row])[0].text_change_type,'unclassified');
 }
});
test('规则版本变化有单独说明，未观察到原文变化时不声称岗位变动',()=>{
 const old=sample('本科及以上');const row={...old,assessment:{...old.assessment,rules_version:'future'}};
 assert.equal(diffRecords([old],[row])[0].text_change_type,null);
 assert.match(diffRecords([old],[row])[0].change,/规则版本改变/);
 assert.deepEqual(diffRecords([old],[old]),[]);
});
