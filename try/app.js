import {assess} from '../lib/rules.js';
const $=id=>document.getElementById(id);
const fieldNames={min_degree:'学历',min_months:'实习月数',min_days:'每周出勤',graduation_range:'毕业月份区间',graduation_min_year:'毕业年份',requires_student:'在校状态'};
const results={pass:'满足此项',fail:'不满足此项',unknown:'条件未知',preference_gap:'未满足偏好（不作硬性排除）'};
const esc=s=>String(s??'未提供').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusKey=s=>s==='明确条件不匹配'?'fail':s==='已识别的硬条件匹配'?'match':'unknown';
let rows=[],evaluated=[],profile={},source='synthetic',loadVersion=0;
function readProfile(){
 const form=$('profile');if(!form.reportValidity())return null;
 const num=id=>$(id).value===''?null:Number($(id).value);
 return {degree:$('degree').value||null,is_student:$('student').value===''?null:$('student').value==='true',graduation_month:$('graduation').value||null,months_available:num('months'),days_per_week:num('days')};
}
function run(){const p=readProfile();if(!p)return;profile=p;evaluated=rows.map(r=>({...r,assessment:assess(r.job_body??r.body??'',p)}));$('validation').textContent='';render();}
function render(){
 const counts={match:0,fail:0,unknown:0};for(const r of evaluated)counts[statusKey(r.assessment.status)]++;
 $('summary').innerHTML=[['match','硬条件匹配'],['fail','明确不匹配'],['unknown','信息不足待复核']].map(([k,t])=>`<div class="metric"><b>${counts[k]}</b><span>${t}</span></div>`).join('');
 const visible=evaluated.filter(r=>$('filter').value==='all'||statusKey(r.assessment.status)===$('filter').value);
 $('result-note').textContent=`本次显示 ${visible.length} / ${evaluated.length} 个岗位 · 所有结论仍需人工复核`;
 $('cards').innerHTML=visible.map(r=>{
 const a=r.assessment;
 let link='';try{const u=new URL(r.url);if(u.protocol==='https:'&&!u.username&&!u.password)link=`<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">查看官网来源 ↗</a>`;}catch{}
 return `<article><div class="company">${esc(r.company)} · ${source==='history'?'历史采集样本':'虚构示例'}</div><h3>${esc(r.title)}</h3><span class="badge ${statusKey(a.status)}">${esc(a.status)}</span><div class="states"><p>页面读取：${esc(source==='history'?r.content_state:'合成正文，未访问网页')}</p><p>申请入口：${esc(source==='history'?r.entry_state:'演示未核验')}</p>${source==='history'?`<p>历史采集时间：${esc(r.observed_at)} · ${link}</p>`:''}</div><details><summary>展开核验依据 · ${a.checks.length} 项已识别条件</summary>${a.checks.length?a.checks.map(c=>`<blockquote>${esc(c.quote)}</blockquote><div class="checkline">${esc(fieldNames[c.field]??c.field)} · ${c.strength==='hard'?'硬条件':'优先项'} · 要求 ${esc(JSON.stringify(c.value))}<br>画像条件 ${esc(JSON.stringify(c.actual))} → <b>${esc(results[c.result])}</b></div>`).join(''):'<p class="hint">未识别到明确条件，不能据此判定符合。</p>'}<p class="hint">未识别的硬条件：${a.missing.length?a.missing.map(f=>fieldNames[f]??f).join('、'):'无（仅限规则覆盖字段）'}</p><p class="hint">${esc(a.scope)}</p><details><summary>查看用于本次判断的完整正文</summary><pre class="raw">${esc(r.job_body??r.body)}</pre></details></details></article>`;
 }).join('')||'<p class="hint">当前筛选下没有岗位。请选择其他状态。</p>';
}
async function load(){
 const version=++loadVersion;source=$('source').value;rows=[];evaluated=[];render();$('download').disabled=true;$('data-note').textContent='正在加载案例…';
 try{const res=await fetch(source==='history'?'../evaluation/reviewed-20/results.json':'../examples/synthetic.json');if(!res.ok)throw Error('load');const data=await res.json();if(version!==loadVersion)return;rows=Array.isArray(data)?data:data.records;
 $('data-note').textContent=source==='history'?'2026 年 10 月的历史岗位；下方按你当前画像重新计算，不沿用历史的 17/3 结论。不是实时招聘状态，也不是准确率评测。':'3 个虚构案例用于演示匹配、不匹配和信息不足，不代表真实岗位或比赛采集结果。';run();$('download').disabled=false;
 }catch{if(version===loadVersion)$('data-note').textContent='案例加载失败，请刷新重试。也可使用页面底部的历史报告链接。';}
}
$('profile').addEventListener('submit',e=>{e.preventDefault();run();});
$('profile').addEventListener('input',()=>{$('validation').textContent='画像已修改，点击「重新核验」更新结果。';$('download').disabled=true;});
$('profile').addEventListener('submit',()=>{$('download').disabled=!evaluated.length;});
$('source').addEventListener('change',load);$('filter').addEventListener('change',render);
function preset(values){for(const [id,value]of Object.entries(values))$(id).value=value;run();$('download').disabled=!evaluated.length;}
$('preset-student').onclick=()=>preset({degree:'本科',student:'true',graduation:'2029-06',months:3,days:4});
$('preset-graduate').onclick=()=>preset({degree:'硕士',student:'false',graduation:'2025-06',months:6,days:5});
$('preset-unknown').onclick=()=>preset({degree:'',student:'',graduation:'',months:'',days:''});
$('download').onclick=()=>{const payload={metadata:{mode:'browser-demo',source,generated_at:new Date().toISOString(),profile,rules_version:'0.1.13',note:'浏览器本地重分析，不是实时采集；不代表可投或录用。'},records:evaluated.map(({company,title,url,observed_at,assessment})=>({company,title,url,observed_at,assessment}))};const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='applycheck-experience.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
load();
