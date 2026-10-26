import fs from 'node:fs/promises';
import path from 'node:path';

const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csv = s=>'"'+String(s??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
const safeLink = s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?esc(s):'#';}catch{return '#';}};

export async function writeReport(records, outDir, metadata={}) {
  await fs.mkdir(outDir,{recursive:true});
  await fs.writeFile(path.join(outDir,'results.json'),JSON.stringify({metadata,records},null,2));
  // 展示固定测试画像（若提供），并区分三类状态汇总；不改变任何判断逻辑。
  const p=metadata.profile;
  const profileHtml=p?`<section class="profile"><h3>测试画像${p.label?' · '+esc(p.label):''}</h3><div class="kv">${[
    ['学校（仅展示）',p.university??p.school],
    ['学历',p.degree],
    ['在校状态',p.is_student===true?'在校':p.is_student===false?'非在校（已毕业）':'未提供'],
    ['毕业年份',p.graduation_year],
    ['毕业月份',p.graduation_month],
    ['可连续实习',p.months_available!=null?p.months_available+' 个月':'未提供'],
    ['每周出勤',p.days_per_week!=null?p.days_per_week+' 天':'未提供']
  ].map(([k,v])=>v!=null&&v!==''?'<span><b>'+esc(k)+'</b> '+esc(v)+'</span>':'').join('')}</div></section>`:'';
  const count=(arr,key,val)=>arr.filter(r=>r?.[key]===val).length;
  const st=records.map(r=>r.assessment?.status).filter(Boolean);
  // 入口状态三档：已真实触发并观察到登录/表单；仅发现可见入口；以及未核验/空。
  const entryVerified=records.filter(r=>/需要登录|表单|入口核验失败|跳转超出|未能点击|未找到唯一|多个入口/.test(r.entry_state??'')).length;
  const entrySeen=records.filter(r=>(r.entry_state??'')==='发现可见入口，尚未验证后续流程').length;
  const summaryHtml=`<section class="summary"><h3>结果汇总</h3><div class="kv">`+
    `<span><b>岗位</b> ${records.length} 个</span>`+
    `<span><b>明确条件不匹配</b> ${st.filter(s=>s==='明确条件不匹配').length}</span>`+
    `<span><b>信息不足待复核</b> ${st.filter(s=>s==='信息不足，待复核').length}</span>`+
    `<span><b>已识别硬条件匹配</b> ${st.filter(s=>s==='已识别的硬条件匹配').length}</span>`+
    `<span class="sep">｜</span>`+
    `<span><b>已读详情</b> ${count(records,'content_state','已读取详情')}</span>`+
    `<span><b>入口已触发核验</b> ${entryVerified}</span>`+
    `<span><b>仅发现入口未触发</b> ${entrySeen}</span>`+
    `</div><p class="hint">同一岗位分别记录：条件初筛（硬门槛判断）、页面读取状态、入口核验状态。三类状态互不替代；“仅发现可见入口”不表示已核验可投递。</p></section>`;
  const rows=records.map(r=>[r.company,r.title,r.url,r.observed_at,r.content_state,r.entry_state,r.assessment?.status,r.assessment?.checks.map(c=>c.quote+' → '+c.result).join('；'),r.assessment?.missing.join('、')]);
  await fs.writeFile(path.join(outDir,'results.csv'),'\ufeff'+[['公司','职位','来源','核验时间','页面状态','入口状态','条件初筛','证据','未识别字段'],...rows].map(r=>r.map(csv).join(',')).join('\r\n'));
  const cards=records.map(r=>`<article data-search="${esc(r.company+' '+r.title+' '+r.assessment?.status)}"><div class="top"><span>${esc(r.company)}</span><span class="tag">${esc(r.content_state)}</span></div><h2>${esc(r.title)}</h2><p class="status">${esc(r.assessment?.status)}</p><p>申请入口：${esc(r.entry_state??'未核验')}</p><p class="small">${esc(r.observed_at)} · ${esc(r.provider)}</p><a href="${safeLink(r.url)}" target="_blank" rel="noopener noreferrer">打开官网来源 ↗</a><details><summary>查看条件证据与缺失项</summary>${(r.assessment?.checks??[]).map(c=>`<blockquote>${esc(c.quote)}<br><strong>${esc(c.field)}：${esc(JSON.stringify(c.value))}</strong><br>用户条件：${esc(JSON.stringify(c.actual))} · ${esc(c.strength)} · ${esc(c.result)}</blockquote>`).join('')}<p>未识别的硬条件字段：${esc((r.assessment?.missing??[]).join('、'))}</p><p>完整正文 SHA-256：${esc(r.body_hash)}</p><p>${esc(r.assessment?.scope)}</p></details></article>`).join('');
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>投前核验 · 结果报告</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f5f8;color:#17243a;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1120px;margin:auto;padding:40px 24px}.eyebrow{color:#3169ce;font-weight:700;letter-spacing:2px}h1{font-size:42px;margin:8px 0}header p{max-width:840px;color:#536178}.notice{background:#fff3cd;border-left:4px solid #deaa23;padding:16px 20px;border-radius:6px;margin:24px 0}.profile,.summary{background:white;border:1px solid #e2e7ee;border-radius:12px;padding:18px 20px;margin:0 0 16px}.profile h3,.summary h3{margin:0 0 10px;font-size:16px;color:#215ec4}.kv{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:15px}.kv span{color:#2b3a52}.kv b{color:#5f6d82;font-weight:600}.sep{color:#c0cbd9}.hint{color:#738096;font-size:13px;margin:10px 0 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}article{background:white;padding:24px;border:1px solid #e2e7ee;border-radius:14px;overflow-wrap:anywhere}h2{font-size:21px;line-height:1.5}.top{display:flex;justify-content:space-between;gap:10px;color:#5f6d82}.tag{background:#edf2fa;padding:0 8px;border-radius:5px;font-size:13px}.status{font-weight:700;color:#215ec4}a{color:#215ec4}.small{font-size:13px;color:#738096}input{width:100%;padding:14px 16px;border:1px solid #ccd6e6;border-radius:8px;font:inherit;margin:0 0 22px}summary{cursor:pointer;color:#355279;margin-top:18px}blockquote{margin:16px 0;padding:12px;background:#f5f7fb;border-left:3px solid #b3c9ee;font-size:14px}footer{margin-top:28px;color:#68788c;font-size:14px}@media(max-width:600px){h1{font-size:32px}main{padding:24px 16px}}</style><main><header><div class="eyebrow">APPLYCHECK / 投前核验</div><h1>每一项判断，都有原文依据。</h1><p>读取岗位条件，区分明确不匹配与信息不足，保留来源和核验时间。当前版本为规则初筛，所有记录仍需人工复核。</p></header><div class="notice"><strong>${esc(metadata.mode==='synthetic'?'合成演示数据 · 不是真实岗位或比赛运行成果':'实际采集记录 · 仅代表所记时间的观察')}</strong><br>${esc(metadata.note??'入口仅记录可见控件或链接，未提交任何申请。')}</div>${profileHtml}${summaryHtml}<label for="search">筛选公司、岗位或初筛状态</label><input id="search" placeholder="输入关键词"><div class="grid">${cards}</div><footer>共 ${records.length} 条记录 · ${esc(metadata.generated_at??'')}<br>“已读取详情”不表示岗位仍在招；可见投递按钮不表示已完成申请入口核验。</footer></main><script>document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('article').forEach(c=>{c.hidden=!c.dataset.search.toLowerCase().includes(q)})})</script></html>`;
  await fs.writeFile(path.join(outDir,'report.html'),html);
}
