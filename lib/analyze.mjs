import { createHash } from 'node:crypto';

export const sha256 = text => createHash('sha256').update(text).digest('hex');
export {extractRequirements, assess} from './rules.js';

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
