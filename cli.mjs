import fs from 'node:fs/promises';
import {parseJsonText} from './lib/json.mjs';
import {validateTargets} from './lib/targets.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {assess,diffRecords,sha256} from './lib/analyze.mjs';
import {writeReport} from './lib/report.mjs';
import {cloudSession,capture,allowedUrl} from './lib/browser.mjs';
import {normalizeRecord} from './lib/normalize.mjs';
import {verifyEntry,writeEntryReport} from './lib/entry.mjs';
import {discoverMeituan} from './lib/meituan.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const read=async p=>parseJsonText(await fs.readFile(p,'utf8'));
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
const args=process.argv.slice(2);
const command=args[0]??'help';
const option=(name,fallback)=>{const n=args.indexOf('--'+name);return n<0?fallback:args[n+1];};
try {
  const env=await fs.readFile('.env','utf8');
  for(const line of env.split(/\r?\n/)) {
    const m=line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
  }
} catch(error) {if(error.code!=='ENOENT')throw error;}

async function profile() {
  const p=await read(option('profile','config/profile.json'));
  if(p.degree!=null&&!['本科','硕士','博士'].includes(p.degree))throw new Error('degree 仅支持 本科/硕士/博士 或 null');
  for(const field of ['months_available','days_per_week']) if(p[field]!=null&&(!Number.isFinite(p[field])||p[field]<0))throw new Error(field+' 必须是非负数字或 null');
  if(p.days_per_week>7)throw new Error('days_per_week 不能超过 7');
  if(p.graduation_month!=null&&!/^20\d{2}-(0[1-9]|1[0-2])$/.test(p.graduation_month))throw new Error('毕业月份格式为 YYYY-MM');
  if(p.is_student!=null&&typeof p.is_student!=='boolean')throw new Error('is_student 必须为 true/false 或 null');
  if(p.graduation_year!=null&&(!Number.isInteger(p.graduation_year)||p.graduation_year<2000||p.graduation_year>2100))throw new Error('graduation_year 必须是 2000—2100 的整数或 null');
  if(p.graduation_month&&p.graduation_year&&Number(p.graduation_month.slice(0,4))!==p.graduation_year)throw new Error('毕业年份与毕业月份冲突');
  return p;
}

async function main() {
  if(command==='doctor') {
    const deps={};
    for(const name of ['lexmount','playwright']) {try {await import(name);deps[name]=true;}catch{deps[name]=false;}}
    const credentials={api_key_present:!!process.env.LEXMOUNT_API_KEY,project_id_present:!!process.env.LEXMOUNT_PROJECT_ID};
    const ready=Object.values(deps).every(Boolean)&&Object.values(credentials).every(Boolean);
    console.log(JSON.stringify({node:process.version,dependencies:deps,credentials,ready_to_attempt_cloud:ready,cloud_authenticated:false,note:'此命令仅做本地检查，不能证明云端鉴权或任务运行成功。'},null,2));
    if(!ready) process.exitCode=2;
    return;
  }
  if(command==='demo') {
    const rows=await read('examples/synthetic.json');
    const p={degree:'本科',graduation_month:'2029-06',months_available:3,days_per_week:4};
    const records=rows.map(r=>({...r,url:'https://example.com/synthetic/'+r.id,provider:'synthetic',observed_at:new Date().toISOString(),body_hash:sha256(r.body),content_state:'合成示例',entry_state:'演示，未核验',assessment:assess(r.body,p)}));
    const out=option('out','output/demo');
    await writeReport(records,out,{mode:'synthetic',generated_at:new Date().toISOString(),note:'所有公司、岗位和条件均为合成测试，用户条件也是假设值，不能作为比赛成果。'});
    console.log('合成演示报告：'+path.resolve(out,'report.html'));return;
  }
  if(command==='discover') {
    const sites=await read('config/sites.json');
    const site=sites.find(s=>s.id===option('site','bytedance'));
    if(!site)throw new Error('未知站点');
    const discoveryLimit=Number(option('limit',3));
    if(!Number.isInteger(discoveryLimit)||discoveryLimit<1||discoveryLimit>5)throw new Error('limit 发现阶段需为 1—5 的整数');
    const out=option('out','output/discover-'+stamp());await fs.mkdir(out,{recursive:true});
    const found=await cloudSession(async({context,sessionId})=>{
      const {record,links}=await capture(context,site,out,0,sessionId,false);
      const pattern=new RegExp(site.detail_pattern);
      const unique=new Map();
      for(const link of links) if(allowedUrl(link.url,site.allowed_hosts)&&pattern.test(link.url)) {
        const u=new URL(link.url);u.hash='';
        unique.set(u.href,{company:site.company,title:link.title.split('\n')[0],url:u.href,allowed_hosts:site.allowed_hosts,provenance:'Lexmount 云端列表发现，详情待核验'});
      }
      if(site.id==='meituan') {
        const clicked=await discoverMeituan(context,site,record,out,discoveryLimit,sessionId);
        for(const target of clicked)unique.set(target.url,target);
      }
      await fs.writeFile(path.join(out,'discovery.json'),JSON.stringify({record,targets:[...unique.values()]},null,2));
      await fs.writeFile(path.join(out,'targets.json'),JSON.stringify([...unique.values()],null,2));
      return unique.size;
    });
    console.log('发现 '+found+' 个详情链接：'+path.resolve(out,'targets.json'));
    if(!found) {console.error('未发现详情链接。可能是页面动态卡片、登录或适配问题，不代表没有岗位。');process.exitCode=3;}return;
  }
  if(command==='verify-entry') {
    const targets=validateTargets(await read(option('targets','config/targets.json')));
    const limit=Number(option('limit',1));
    if(!Number.isInteger(limit)||limit<1||limit>3)throw new Error('limit 入口探测需为1—3的整数');
    const selected=targets.slice(0,limit);if(!selected.length)throw new Error('没有目标岗位');
    const out=option('out','output/entry-'+stamp());await fs.mkdir(out,{recursive:true});
    const records=[];
    await cloudSession(async({context,sessionId})=>{
      for(const [index,target]of selected.entries()) {
        const record=await verifyEntry(context,target,out,index+1,sessionId);
        records.push(record);await writeEntryReport(records,out);
        console.log(`${index+1}/${selected.length} ${record.company} ${record.state}`);
      }
    });
    console.log('入口报告：'+path.resolve(out,'entry-report.html'));
    return;
  }
  if(command==='collect') {
    const targets=validateTargets(await read(option('targets','config/targets.json')));
    const p=await profile();
    const limit=Number(option('limit',3));
    if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('limit 需为 1—50 的整数');
    const selected=targets.slice(0,limit);if(!selected.length)throw new Error('没有目标岗位');
    const out=option('out','output/run-'+stamp());await fs.mkdir(out,{recursive:true});
    const metadata={mode:'live',generated_at:new Date().toISOString(),profile:p,collector_version:'0.1.13',note:'Lexmount 云端实际读取；入口只记录可见状态，未点击投递或提交申请。'};
    await fs.writeFile(path.join(out,'run.json'),JSON.stringify(metadata,null,2));
    const records=[];
    await cloudSession(async({context,sessionId})=>{
      for(const [i,target]of selected.entries()) {
        const {record}=await capture(context,target,out,i+1,sessionId);
        record.assessment=assess(record.job_body??record.body,p);
        // 每一条完成后落盘，后续失败不会丢失已取得的结果。
        records.push(record);await writeReport(records,out,metadata);
        console.log(`${i+1}/${selected.length} ${record.company} ${record.content_state}`);
        if(i<selected.length-1)await new Promise(resolve=>setTimeout(resolve,1500));
      }
    });
    console.log('结果报告：'+path.resolve(out,'report.html'));
    if(!records.some(r=>r.content_state==='已读取详情'))process.exitCode=3;
    return;
  }
  if(command==='analyze') {
    const input=option('input');if(!input)throw new Error('需要 --input path/to/results.json');
    const inputData=await read(input);const p=await profile();
    const records=(inputData.records??[inputData]).map(normalizeRecord);
    for(const r of records)r.assessment=assess(r.job_body??r.body,p);
    const mode=records.every(r=>r.provider==='synthetic')?'synthetic':'reanalysis';
    const out=option('out','output/reanalysis-'+stamp());
    await writeReport(records,out,{mode,generated_at:new Date().toISOString(),profile:p,note:'基于已保存正文重新分析，不代表刚刚重新访问官网。'});
    console.log('重新分析完成：'+path.resolve(out,'report.html'));return;
  }
  if(command==='compare') {
    const before=option('before'),after=option('after');if(!before||!after)throw new Error('需要 --before 和 --after 两份 results.json');
    const changes=diffRecords((await read(before)).records,(await read(after)).records);
    const out=option('out','output/changes.json');await fs.mkdir(path.dirname(out),{recursive:true});
    await fs.writeFile(out,JSON.stringify({generated_at:new Date().toISOString(),changes},null,2));
    console.log('变化记录：'+path.resolve(out));return;
  }
  console.log('命令：doctor / demo / discover --site bytedance / collect --limit 3 / analyze --input FILE / verify-entry --targets FILE --limit 1 / compare --before FILE --after FILE');
}
main().catch(error=>{
  // 已知配置错误可直出；未预期的 SDK 错误只输出类型，避免泄漏连接凭据。
  const known=/^(缺少|需要|未知|没有|目标|degree|毕业|days_per_week|months_available|is_student|graduation_year|limit)/.test(error.message);
  console.error(known?error.message:`${error.name??'Error'}：运行未完成。检查配置、依赖和 Lexmount 控制台；未输出可能含凭据的底层异常。`);
  process.exitCode=1;
});
