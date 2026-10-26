export const reviewFields=['min_degree','requires_student','min_months','min_days','graduation'];
export function parseReviewValue(field,value) {
 const text=String(value??'').trim();
 if(!text)throw new Error('尚未填写');
 if(text==='未明确'||text==='unknown')return null;
 if(field==='min_degree'&&['本科','硕士','博士'].includes(text))return text;
 if(field==='requires_student'&&text==='必须在校')return true;
 if(['min_months','min_days'].includes(field)&&/^\d+$/.test(text)) {
  const number=Number(text);if(number>=1&&number<=(field==='min_days'?7:120))return number;
 }
 if(field==='graduation') {
  if(/^>=20\d{2}$/.test(text))return {kind:'min_year',value:Number(text.slice(2))};
  const m=text.match(/^(20\d{2}-(?:0[1-9]|1[0-2]))\s*[~～至]\s*(20\d{2}-(?:0[1-9]|1[0-2]))$/);
  if(m&&m[1]<=m[2])return {kind:'month_range',value:[m[1],m[2]]};
 }
 throw new Error('格式不符合本页说明');
}
export function validateHumanRecord(record,source) {
 const errors=[];const parsed={};
 for(const field of reviewFields) {
  const cell=record.fields?.[field]??{};
  try {
   parsed[field]=parseReviewValue(field,cell.value);
   if(parsed[field]!==null) {
    const quote=(cell.quote??'').trim();
    if(!quote)errors.push(field+'：请粘贴原文依据');
    else if(!source.body.replace(/\s/g,'').includes(quote.replace(/\s/g,'')))errors.push(field+'：引用未在采集原文中找到');
   }
  }catch(error){errors.push(field+'：'+error.message);}
 }
 if(!['明确条件不匹配','信息不足，待复核','已识别的硬条件匹配'].includes(record.status))errors.push('请选择独立判断结论');
 if(!record.reason?.trim())errors.push('请写一句判断依据或待确认事项');
 return {valid:errors.length===0,errors,parsed};
}
export function hardFields(assessment) {
 const checks=(assessment?.checks??[]).filter(c=>c.strength==='hard');
 const out={};
 for(const field of reviewFields) {
  if(field==='graduation') {
   const range=checks.find(c=>c.field==='graduation_range');
   const years=checks.filter(c=>c.field==='graduation_min_year').map(c=>c.value);
   out[field]=range?{kind:'month_range',value:range.value}:years.length?{kind:'min_year',value:Math.max(...years)}:null;
  } else {
   const values=checks.filter(c=>c.field===field).map(c=>c.value);
   out[field]=!values.length?null:['min_months','min_days'].includes(field)?Math.max(...values):values[0];
  }
 }
 return out;
}
export function reviewMode(review) {
 // AI 自动复核沿用 applycheck-human-review-v1 以兼容工作台；
 // 必须按 review_mode 区分来源，缺失时视为人工，绝不因 schema 名称或 completed 推断成人工。
 return review?.review_mode==='ai_automatic'?'ai':'human';
}
export function scoreHumanReview(review,dataset) {
 const mode=reviewMode(review);
 const records=new Map(dataset.records.map(r=>[r.url,r]));
 const seen=new Set(),details=[];let completed=0,matched=0,slots=0,known=0,knownMatched=0,statusMatched=0;
 for(const label of review.records??[]) {
  // AI 自动复核不计入“已完成的人工作业标签”，不混入人工口径。
  if(mode==='ai'||label.completed!==true)continue;
  const source=records.get(label.url);
  if(!source||source.body_hash!==label.body_hash||seen.has(label.url))throw new Error('复核记录的来源、哈希或唯一性与数据集不符');
  seen.add(label.url);
  const valid=validateHumanRecord(label,source);if(!valid.valid)throw new Error('复核记录未通过校验：'+valid.errors.join('；'));
  completed++;const actual=hardFields(source.assessment);
  for(const field of reviewFields) {
   const same=JSON.stringify(valid.parsed[field])===JSON.stringify(actual[field]);
   slots++;if(same)matched++;if(valid.parsed[field]!==null){known++;if(same)knownMatched++;}
   if(!same)details.push({url:label.url,title:source.title,field,human:valid.parsed[field],program:actual[field]});
  }
  if(label.status===source.assessment.status)statusMatched++;
 }
 return {reviewer_mode:mode,completed_jobs:completed,total_jobs:dataset.records.length,field_slots:slots,matching_slots:matched,
   explicitly_labeled_fields:known,matching_explicit_fields:knownMatched,matching_job_status:statusMatched,
   evaluation_scope:'仅 completed 的'+(mode==='ai'?'AI 自动复核（不计为人工完成）':'人工作业标签')+'与既定程序结果的一致性；五类明确硬条件。未标注不计入分母，尚不证明整体产品准确率。',differences:details};
}
