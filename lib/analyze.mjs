import { createHash } from 'node:crypto';

export const sha256 = text => createHash('sha256').update(text).digest('hex');
const numberMap = {一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7};
const numeric = s => numberMap[s] ?? Number(s);
const preferred = s => /优先|加分|更佳|preferred/i.test(s);

// 初版仅自动判断有明确句式的条件。复杂语义交给复核，不能把“未识别”当作符合。
export function extractRequirements(text) {
  const result = [];
  let preferredSection=false;
  const clauseAt=(line,index)=>{
    let start=index,end=index;
    while(start>0&&!/[，,]/.test(line[start-1]))start--;
    while(end<line.length&&!/[，,]/.test(line[end]))end++;
    return line.slice(start,end).trim();
  };
  const add = (field, value, quote, index) => {
    const clause=clauseAt(quote,index);
    result.push({field,value,quote,evidence_clause:clause,
      strength:preferredSection||preferred(clause)?'preferred':'hard',
      strength_basis:preferredSection?'preferred_section':'local_clause'});
  };
  const normalized = text.replace(/\r/g, '').replace(/；/g, ';');
  const lines = normalized.split(/[\n;。]/).map(s => s.trim()).filter(Boolean);
  for (const line of lines) {
    if(/^(?:加分项|优先条件|优先资格|以下.*优先|具备以下.*优先)[：:]?$/.test(line))preferredSection=true;
    if(/^(?:职位要求|任职要求|岗位(?:基本)?要求|基本要求|必备条件|职位描述|岗位职责|岗位亮点|【岗位亮点】)[：:]?$/.test(line))preferredSection=false;
    for (const match of line.matchAll(/(?:至少|不少于|不低于|不短于|最短|为期)\s*(\d+|[一二两三四五六])\s*个?月|(\d+|[一二两三四五六])\s*个?月(?:及以上|以上|起)/g)) {
      if(/年\s*$/.test(line.slice(0,match.index)))continue; // 年月日期中的月份不是实习时长。
      if (/实习|到岗|出勤|intern/i.test(line) && !/薪资|工资|发放|绩效/.test(line)) {
        add('min_months', numeric(match[1]??match[2]), line, match.index);
      }
    }
    for (const match of line.matchAll(/(?:每周|一周|周)[^\n。;，,]{0,12}?([1-7一二两三四五六七])\s*(?:[-—~～至到]\s*([1-7一二两三四五六七]))?\s*(?:天|日)/g)) {
      const lower=numeric(match[1]),upper=match[2]?numeric(match[2]):lower;
      if(upper<lower)continue;
      if (/实习|到岗|出勤|保证|至少|不少于|每周/.test(line)) add('min_days',lower,line,match.index);
    }
    // 有明确下界和学生/学历语境才解释届别；单独“某届”仍不猜日期。
    const cohort=line.match(/(?<!\d)(20\d{2}|\d{2})\s*届\s*(?:及以后|及之后|及以上|以后|之后)/);
    if(cohort&&/本科|硕士|博士|研究生|学生|毕业/.test(clauseAt(line,cohort.index))) {
      const year=Number(cohort[1])+(cohort[1].length===2?2000:0);
      add('graduation_min_year',year,line,cohort.index);
      result.at(-1).interpretation='招聘届别按毕业年份比较；两位届别按2000年代展开，仅保留年份下界，不推测月份';
    }
    const student=line.match(/在校生|在校学生|(?:本科|硕士|博士|研究生)[^，,;。\n]{0,16}在读/);
    if(student&&!/不限在校|不要求在校|非在校|无需在校/.test(clauseAt(line,student.index)))add('requires_student',true,line,student.index);
    const degree = line.match(/(本科|硕士|博士)(?:研究生)?(?:学历)?(?:及以上|以上)(?:学历)?/);
    if (degree) add('min_degree', degree[1], line, degree.index);
    else {
      const alternatives=line.match(/本科\s*(?:或|及)\s*(?:硕士|研究生)/);
      if(alternatives)add('min_degree','本科',line,alternatives.index);
    }
    // 只接受明确的毕业年月区间；“2027届”单独出现仍留给人工确认。
    if (/毕业/.test(line)) {
      const range = line.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*[-—~至到]\s*(20\d{2})\s*年\s*(\d{1,2})\s*月/);
      if (range && [range[2],range[4]].every(x=>Number(x)>=1 && Number(x)<=12)) {
        add('graduation_range', [range[1]+'-'+range[2].padStart(2,'0'),range[3]+'-'+range[4].padStart(2,'0')], line, range.index);
      }
    }
  }
  return result.filter((r,i,a) => a.findIndex(x=>JSON.stringify(x)===JSON.stringify(r))===i);
}

const ranks = {本科:1,硕士:2,博士:3};
export function assess(text, profile) {
  const requirements = extractRequirements(text);
  const checks = requirements.map(r => {
    let actual, pass;
    if (r.field === 'min_months') actual = profile.months_available;
    if (r.field === 'min_days') actual = profile.days_per_week;
    if (r.field === 'min_degree') actual = profile.degree;
    if (r.field === 'requires_student') actual=profile.is_student;
    if (r.field === 'graduation_range') actual = profile.graduation_month;
    if(r.field==='graduation_min_year') {
      actual=Number.isInteger(profile.graduation_year)?profile.graduation_year:
        /^20\d{2}-\d{2}$/.test(profile.graduation_month??'')?Number(profile.graduation_month.slice(0,4)):null;
    }
    if(r.field==='graduation_range'&&!actual&&Number.isInteger(profile.graduation_year)) {
      const year=profile.graduation_year;
      const lower=String(year)+'-01',upper=String(year)+'-12';
      actual=String(year)+'（仅年份）';
      const result=upper<r.value[0]||lower>r.value[1]?'fail':lower>=r.value[0]&&upper<=r.value[1]?'pass':'unknown';
      return {...r,actual,result:result==='fail'&&r.strength==='preferred'?'preference_gap':result,
        precision:'year',note:result==='unknown'?'年份与要求区间部分重叠，需补充毕业月份':'仅依据已知年份判断，未推测毕业月份'};
    }
    if (actual === null || actual === undefined || actual === '') return {...r, actual:null, result:'unknown'};
    if(r.field==='requires_student') {
      if(typeof actual!=='boolean')return {...r,actual:null,result:'unknown'};
      pass=actual===r.value;
    } else if (r.field === 'min_degree') {
      if (!ranks[actual]) return {...r, actual, result:'unknown'};
      pass = ranks[actual]>=ranks[r.value];
    } else if (r.field === 'graduation_range') pass = actual>=r.value[0] && actual<=r.value[1];
    else pass = Number(actual)>=r.value;
    return {...r, actual, result:pass?'pass':r.strength==='preferred'?'preference_gap':'fail'};
  });
  const requiredFields = ['min_degree','min_months','min_days','graduation_range'];
  const missing = requiredFields.filter(f=>!requirements.some(r=>(r.field===f||(f==='graduation_range'&&r.field==='graduation_min_year')) && r.strength==='hard'));
  const hardFail = checks.some(c=>c.strength==='hard' && c.result==='fail');
  const uncertain = checks.some(c=>c.strength==='hard' && c.result==='unknown');
  return {
    status:hardFail?'明确条件不匹配':(uncertain||missing.length)?'信息不足，待复核':'已识别的硬条件匹配',
    checks, missing, rules_version:'0.1.13',
    review_required:true,
    scope:'规则初筛，仅覆盖学历、在校状态、时长、出勤和毕业区间；专业、技能、城市、项目规则和复杂语义须复核。条件匹配不代表可投或录用。'
  };
}

export function contentState(text, httpStatus, isDetail=true) {
  if (httpStatus>=400) return '访问失败';
  if (/(职位已下线|职位已关闭|职位已结束|该职位不存在|岗位已下架|招聘已结束)/.test(text)) return '页面明确显示关闭';
  if (text.trim().length<100) return '内容不足';
  if (/(职位要求|任职要求|岗位(?:基本)?要求|任职资格|Qualifications)/i.test(text) && isDetail) return '已读取详情';
  if (/(验证码|安全验证|验证您是|访问过于频繁)/.test(text) && !/(职位描述|岗位职责)/.test(text)) return '访问受限';
  return isDetail?'待确认是否详情页':'已读取列表';
}

export function diffRecords(previous, current) {
  const key=r=>r.url;
  const before=new Map(previous.map(r=>[key(r),r]));
  const after=new Map(current.map(r=>[key(r),r]));
  const diff=[];
  for(const [url,row] of after) {
    const old=before.get(url);
    if(!old) {diff.push({url,change:'本次新增观察',title:row.title});continue;}
    const changes=[];
    let text_change_type=null;
    if(old.body_hash!==row.body_hash) {
      const comparable=old.content_state==='已读取详情'&&row.content_state==='已读取详情'&&
        typeof old.normalization_version==='string'&&old.normalization_version===row.normalization_version&&
        [old,row].every(r=>typeof r.job_body==='string'&&r.job_body.length>0&&sha256(r.job_body)===r.job_body_hash&&
          typeof r.body==='string'&&sha256(r.body)===r.body_hash);
      if(comparable&&old.job_body===row.job_body) {
        text_change_type='auxiliary_only';changes.push('页面附属内容改变，岗位正文未变');
      } else if(comparable) {
        text_change_type='job_body_changed';changes.push('岗位正文改变，需复核具体内容');
      } else {
        text_change_type='unclassified';changes.push('页面正文改变，缺少可比的有效岗位正文，待复核');
      }
    }
    if(old.assessment?.rules_version!==row.assessment?.rules_version)changes.push('规则版本改变，条件结果不可直接归因于岗位变化');
    else if(JSON.stringify(old.assessment?.checks)!==JSON.stringify(row.assessment?.checks)) changes.push('已识别条件或用户条件改变，需对照原文');
    if(old.content_state!==row.content_state) changes.push('读取状态改变');
    if(changes.length)diff.push({url,change:changes.join('；'),title:row.title,text_change_type});
  }
  for(const [url,row]of before) if(!after.has(url))diff.push({url,title:row.title,change:'本次未采集到，不能据此判为下架'});
  return diff;
}
