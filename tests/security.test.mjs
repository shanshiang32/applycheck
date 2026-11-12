import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {writeReport} from '../lib/report.mjs';
import {allowedUrl} from '../lib/browser.mjs';
test('官网导航拒绝非HTTPS端口',()=>{
 assert.equal(allowedUrl('https://jobs.bytedance.com:8443/', ['jobs.bytedance.com']),false);
 assert.equal(allowedUrl('https://jobs.bytedance.com:443/', ['jobs.bytedance.com']),true);
});
test('CSV阻断前导空白公式，HTML转义不可信标题',async()=>{
 const out='output/security-regression';
 await writeReport([{company:'  =1+1',title:'<script>alert(1)</script>'}],out,{mode:'synthetic'});
 const csv=await fs.readFile(out+'/results.csv','utf8');
 assert.ok(csv.includes('"\'  =1+1"'));
 const html=await fs.readFile(out+'/report.html','utf8');
 assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!html.includes('<script>alert(1)</script>'));
});
