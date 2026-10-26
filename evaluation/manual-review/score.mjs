import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {scoreHumanReview,reviewMode} from './core.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const arg=(key,defaultValue)=>{const index=args.indexOf('--'+key);return index<0?defaultValue:args[index+1];};
const input=arg('input');
if(!input){console.error('需要 --input 人工复核JSON路径');process.exitCode=1;}
else {
 try {
  const read=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
  const dataset=await read(path.join(here,'../reviewed-20/results.json'));
  const review=await read(input);
  const fingerprint=createHash('sha256').update(JSON.stringify(dataset.records.map(r=>[r.url,r.body_hash]))).digest('hex');
  if(review.schema!=='applycheck-human-review-v1'||review.dataset_fingerprint!==fingerprint)throw new Error('复核文件不属于这份20岗数据集');
  const fields=['degree','graduation_year','graduation_month','is_student','months_available','days_per_week'];
  if(fields.some(field=>review.profile?.[field]!==dataset.metadata.profile?.[field]))throw new Error('复核画像与固定数据集不符');
  const result=scoreHumanReview(review,dataset);
  result.reviewer=review.reviewer??'';result.generated_at=new Date().toISOString();result.rules_version=dataset.metadata.rules_version;
  const out=arg('out',path.join(here,'human-review-metrics.json'));await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,JSON.stringify(result,null,2));
  const kind=reviewMode(review)==='ai'?'AI 自动复核（不计为人工完成）':'人工作业标签';
  console.log(`来源：${kind}；已完成 ${result.completed_jobs}/${result.total_jobs} 岗；字段一致 ${result.matching_slots}/${result.field_slots}；明确字段一致 ${result.matching_explicit_fields}/${result.explicitly_labeled_fields}。`);
  console.log('评测记录：'+path.resolve(out));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
