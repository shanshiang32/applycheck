import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.options=this.children;this.value='';this.style={};this.files=[];this.className='';this.disabled=false;}
 append(node){this.children.push(node);}
 replaceChildren(){this.children.length=0;}
 setAttribute(){}
 click(){this.clicked=true;}
}
const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const document={getElementById:get,createElement:tag=>{const e=new Element(tag);Object.defineProperty(e,'id',{set(id){nodes.set(id,e);}});return e;}};
const storage=new Map();let exported;
const context=vm.createContext({document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Date,JSON,Blob,
 URL:{createObjectURL:blob=>{exported=blob;return 'blob:test';},revokeObjectURL(){}},setTimeout:fn=>fn(),setInterval(){}});
const html=await fs.readFile(new URL('./review-20.html',import.meta.url),'utf8');
vm.runInContext(html.match(/<script>([\s\S]*)<\/script>/)[1],context);
assert.equal(get('count').textContent,'0 / 20 岗已复核');assert.equal(get('index').options.length,20);
get('complete').onclick();assert.match(get('msg').textContent,/尚未填写/);
const values={min_degree:['本科','本科及以上学历在读'],requires_student:['必须在校','本科及以上学历在读'],min_months:['3','可实习三个月以上'],min_days:['5','每周实习5天'],graduation:['未明确','']};
for(const [field,[value,quote]]of Object.entries(values)){get('v-'+field).value=value;get('q-'+field).value=quote;}
get('verdict').value='明确条件不匹配';get('reason').value='画像已毕业，不满足在读要求';get('complete').onclick();
assert.equal(get('count').textContent,'1 / 20 岗已复核');
get('next').onclick();assert.equal(get('index').value,'1');get('prev').onclick();assert.equal(get('v-min_days').value,'5');
get('export').onclick();const saved=JSON.parse(await exported.text());assert.equal(saved.records.filter(r=>r.completed).length,1);
get('form').oninput();assert.equal(get('count').textContent,'0 / 20 岗已复核');
await get('import').onchange({target:{files:[{text:async()=>JSON.stringify(saved)}],value:'file'}});
assert.equal(get('count').textContent,'1 / 20 岗已复核');
console.log('DOM模拟交互检查通过：初始空白、拒绝未填、确认、切换保留、部分导出、修改重置与导入续做。');
