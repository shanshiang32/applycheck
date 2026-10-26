import {allowedUrl} from './browser.mjs';

// 所有校验在创建云端session之前完成。拒绝嵌套数组，不静默展平或猜测URL。
export function validateTargets(data) {
  if(!Array.isArray(data)||data.length===0)throw new Error('目标配置必须是非空岗位对象数组');
  for(const [index,target]of data.entries()) {
    const prefix=`目标配置第${index+1}项`;
    if(!target||typeof target!=='object'||Array.isArray(target))throw new Error(prefix+'必须是岗位对象，不能是嵌套数组或空值');
    if(typeof target.company!=='string'||!target.company.trim())throw new Error(prefix+'缺少公司名称');
    if(typeof target.title!=='string'||!target.title.trim())throw new Error(prefix+'缺少岗位名称');
    if(!Array.isArray(target.allowed_hosts)||!target.allowed_hosts.length||target.allowed_hosts.some(h=>typeof h!=='string'||!h.trim()))throw new Error(prefix+'缺少有效的官网域名配置');
    if(typeof target.url!=='string'||!allowedUrl(target.url,target.allowed_hosts))throw new Error(prefix+'缺少允许范围内的HTTPS官网URL');
  }
  return data;
}
