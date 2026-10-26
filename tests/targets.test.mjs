import test from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {validateTargets} from '../lib/targets.mjs';
const target={company:'测试',title:'测试岗位',url:'https://jobs.bytedance.com/campus/position/1/detail',allowed_hosts:['jobs.bytedance.com']};
test('拒绝PowerShell嵌套数组、空配置和缺失URL对象',()=>{
 for(const input of [[[target]],[],null,{},[null],[{...target,url:undefined}]])assert.throws(()=>validateTargets(input),/^Error: 目标配置/);
});
test('目标必须有岗位名称、公司、域名及允许范围内HTTPS URL',()=>{
 for(const mutation of [{title:''},{company:''},{allowed_hosts:[]},{url:'https://evil.example/detail'},{url:'http://jobs.bytedance.com/detail'},{url:'https://user:password@jobs.bytedance.com/detail'}])assert.throws(()=>validateTargets([{...target,...mutation}]),/^Error: 目标配置/);
 assert.deepEqual(validateTargets([target]),[target]);
});
test('预制batch03为5个独立对象且均未与之前10岗及首岗重复',async()=>{
 const rows=JSON.parse(await fs.readFile(new URL('../config/bytedance-batch-03.json',import.meta.url),'utf8'));
 assert.equal(validateTargets(rows).length,5);assert.equal(new Set(rows.map(r=>r.url)).size,5);
 for(const name of ['batch-01-20261020.json','first-live-20261020.json']) {
  const data=JSON.parse(await fs.readFile(new URL('../examples/'+name,import.meta.url),'utf8'));
  for(const row of data.records??[data])assert.ok(!rows.some(t=>t.url===row.url));
 }
});
test('两个实际CLI入口均在创建云端session前拒绝嵌套配置',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'applycheck-targets-'));const file=path.join(dir,'bad.json');
 try {
  await fs.writeFile(file,JSON.stringify([[target]]));
  for(const command of ['collect','verify-entry']) {
   const result=spawnSync(process.execPath,[fileURLToPath(new URL('../cli.mjs',import.meta.url)),command,'--targets',file],{encoding:'utf8',timeout:5000});
   assert.equal(result.status,1);assert.match(result.stderr,/目标配置第1项必须是岗位对象/);
   assert.ok(!result.stderr.includes('缺少 Lexmount'));
  }
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
