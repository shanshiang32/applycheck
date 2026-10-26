# 0.1.5 累积补丁：美团失败现场与可见标题定位

用户真实试跑三次均为 TimeoutError。旧日志不足以判断发生在导航、等待标题或点击阶段，不能据此认定根因。

本次改为检查所有精确同名元素，只有唯一可见标题才点击；记录 stage、HTTP 状态、匹配数量、现场岗位列表和结束时间。异常也保存 click-XX.txt 和公开页面截图 click-XX.png。不会保存底层错误原文，不点击投递。

覆盖原 applycheck 同名文件，无需重新安装依赖。保留 .env、默认 profile 和历史 output。包含此前全部补丁。

```powershell
npm.cmd test
node cli.mjs discover --site meituan --limit 1 --out output/meituan-diagnostic-03
Get-Content .\output\meituan-diagnostic-03\click-attempts.json -Raw -Encoding UTF8
```

请提供日志以及 click-01.txt。若仍无法定位，再提供 click-01.png。37 项离线测试通过，包含标题缺失时保留失败现场的回归测试；未验证真实云端点击成功。
