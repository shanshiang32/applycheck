// 本地功能检查，不是人工评测结果。
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {parseReviewValue,validateHumanRecord,scoreHumanReview,reviewMode} from './core.mjs';
assert.equal(parseReviewValue('min_months','未明确'),null);
assert.deepEqual(parseReviewValue('graduation','2026-09~2027-08'),{kind:'month_range',value:['2026-09','2027-08']});
assert.throws(()=>parseReviewValue('graduation','2027-08~2026-09'));
assert.throws(()=>parseReviewValue('min_days','8'));
const source={url:'https://example.com/job',body_hash:'testhash',body:'本科及以上学历在读，每周4天',assessment:{status:'明确条件不匹配',checks:[{field:'min_degree',value:'本科',strength:'hard'},{field:'requires_student',value:true,strength:'hard'},{field:'min_days',value:4,strength:'hard'}]}};
const record={url:source.url,body_hash:source.body_hash,completed:true,fields:{min_degree:{value:'本科',quote:'本科及以上学历在读'},requires_student:{value:'必须在校',quote:'本科及以上学历在读'},min_months:{value:'未明确'},min_days:{value:'4',quote:'每周4天'},graduation:{value:'未明确'}},status:'明确条件不匹配',reason:'当前画像非在校'};
assert.equal(validateHumanRecord(record,source).valid,true);
assert.equal(validateHumanRecord({...record,fields:{...record.fields,min_days:{value:'5',quote:'每周5天'}}},source).valid,false);
const result=scoreHumanReview({records:[record]},{records:[source]});assert.equal(result.matching_slots,5);
assert.equal(scoreHumanReview({records:[{...record,completed:false}]},{records:[source]}).field_slots,0);
// AI 自动复核不得混入人工完成口径（来源标识）。
assert.equal(reviewMode({review_mode:'ai_automatic'}),'ai');
assert.equal(reviewMode({schema:'applycheck-human-review-v1',records:[record],completed:true}),'human');
const aiReview={schema:'applycheck-human-review-v1',review_mode:'ai_automatic',records:[record],reviewer:{display_name:'AI自动复核'}};
assert.equal(scoreHumanReview(aiReview,{records:[source]}).field_slots,0);
assert.equal(scoreHumanReview(aiReview,{records:[source]}).reviewer_mode,'ai');
assert.throws(()=>scoreHumanReview({records:[record,record]},{records:[source]}));
assert.throws(()=>scoreHumanReview({records:[{...record,body_hash:'wrong'}]},{records:[source]}));
const html=await fs.readFile(new URL('./review-20.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(script);
assert.ok(!html.includes('"assessment":'));assert.ok(html.includes('"rows":['));
console.log('复核格式、证据引用、未完成排除、来源校验及页面脚本语法检查通过。');
