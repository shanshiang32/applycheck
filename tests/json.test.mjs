import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJsonText} from '../lib/json.mjs';
import {contentState,extractRequirements} from '../lib/analyze.mjs';

test('普通与PowerShell BOM配置均能解析，内部BOM仍保留',()=>{
  assert.deepEqual(parseJsonText('\uFEFF[{"title":"HR实习生"}]'),parseJsonText('[{"title":"HR实习生"}]'));
  assert.equal(parseJsonText('{"text":"a\uFEFFb"}').text,'a\uFEFFb');
  assert.throws(()=>parseJsonText('\uFEFF{broken}'),SyntaxError);
});
test('美团岗位基本要求标题可识别为详情，且结束优先项段落',()=>{
  const body='岗位职责\n1. 负责餐饮类客户的视觉设计需求，包括海报、菜单、宣传页等物料的设计与优化。\n2. 配合客户运营团队，理解客户需求并转化为具有吸引力的视觉方案。\n加分项\n设计经验\n岗位基本要求\n本科及以上学历，设计类相关专业优先';
  assert.equal(contentState(body,200,true),'已读取详情');
  const degree=extractRequirements(body).find(x=>x.field==='min_degree');
  assert.equal(degree.strength,'hard');
});
