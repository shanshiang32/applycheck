import {sha256} from './analyze.mjs';

const genericTitle=s=>/^(校招|校园招聘|社会招聘|招聘|职位|职位详情|首页|登录|注册|招聘官网|相关职位)$/i.test(s.trim());

// 原始正文和哈希始终保留。当前岗位的文本仅为带版本号的派生视图。
export function normalizeRecord(record) {
  const raw=record.body??'';
  const lines=raw.replace(/\r/g,'').split('\n');
  const end=lines.findIndex(line=>/^(相关职位|推荐职位|猜你喜欢)\s*$/.test(line.trim()));
  const jobBody=(end>=0?lines.slice(0,end):lines).join('\n').trim();
  const nonempty=jobBody.split('\n').map(s=>s.trim()).filter(Boolean);
  let title=record.title??'',source='existing_unverified',verified=false;
  // 字节详情正文顶部结构：岗位名、城市、类型、职位 ID。要求确实是详情 URL。
  let bytedanceDetail=false;
  try {const u=new URL(record.final_url??record.url);bytedanceDetail=u.hostname==='jobs.bytedance.com'&&/^\/campus\/position\/\d+\/detail\/?$/.test(u.pathname);}catch{}
  const idIndex=nonempty.findIndex(s=>/^职位\s*ID\s*[:：]/i.test(s));
  if(bytedanceDetail&&idIndex>0&&idIndex<=8&&nonempty[0].length>=6&&!genericTitle(nonempty[0])&&!/职位描述|职位要求|岗位职责/.test(nonempty[0])) {
    title=nonempty[0];source='bytedance_detail_header';verified=true;
  } else if(title&&!genericTitle(title)&&nonempty.includes(title)) {
    source='existing_title_in_body';verified=true;
  } else if(record.target_title&&!genericTitle(record.target_title)&&nonempty.includes(record.target_title)) {
    title=record.target_title;source='target_title_in_body';verified=true;
  } else {
    const candidate=(record.heading_candidates??[]).find(t=>!genericTitle(t)&&nonempty.includes(t)&&t.length>=6);
    if(candidate){title=candidate;source='main_heading_in_body';verified=true;}
    else if(genericTitle(title))title='岗位名称待核验';
  }
  return {...record,title,title_verified:verified,title_source:source,
    job_body:jobBody,job_body_hash:sha256(jobBody),normalization_version:'0.1.1',
    normalization_notes:end>=0?['已从派生岗位正文中排除相关职位区域；原始 body 及其哈希未修改']:[]};
}
