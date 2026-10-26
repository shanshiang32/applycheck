import {parseJsonText} from './lib/json.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeRecord} from './lib/normalize.mjs';
import {assess,sha256} from './lib/analyze.mjs';
import {writeReport} from './lib/report.mjs';

process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2);
const opt=(key,fallback)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1];};
async function main(){
  const input=opt('input','output/first-live/001.json');
  const output=opt('out','output/first-live-reviewed');
  const data=parseJsonText(await fs.readFile(input,'utf8'));
  const profilePath=opt('profile','config/profile.json');
  const profile=parseJsonText(await fs.readFile(profilePath,'utf8'));
  const records=(data.records??[data]).map(row=>{
    if(typeof row.body!=='string'||!row.body_hash||sha256(row.body)!==row.body_hash)throw new Error('原始正文哈希不一致，已停止修复');
    const result=normalizeRecord(row);
    result.assessment=assess(result.job_body,profile);
    return result;
  });
  if(path.resolve(input)===path.resolve(output,'results.json'))throw new Error('请使用新输出目录，保留原始记录');
  await writeReport(records,output,{mode:'reanalysis',generated_at:new Date().toISOString(),
    transformation:'offline-review-0.1.3',source_file:input,profile,
    note:'基于原始云端正文和指定用户画像离线核验条件，修正标题并排除相关职位。保留原采集时间和正文哈希；不是重新访问官网。'});
  console.log('离线修复完成，未访问云平台：'+path.resolve(output,'report.html'));
  for(const r of records)console.log(r.title+' | '+r.assessment.status);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
