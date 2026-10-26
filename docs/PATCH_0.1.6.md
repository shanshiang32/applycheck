# 0.1.6 累积补丁：分离可点击性、点击动作与详情核验

真实日志已确认标题唯一且可见、HTTP 200，失败发生在点击调用，随后正文读取及截图也失败。尚不能确认根因。

改动：点击前保存 click-XX-before.txt 和视口截图；通过 trial 检查可点击性，再执行正常点击。点击采用 noWaitAfter，页面跳转由独立循环核验。该选项在 Playwright 官方文档标为 deprecated，目前仍有作用，本项目暂用于排查导航等待阻塞。若真实点击 TimeoutError，记录固定诊断类别并继续观察结果一次，不重复点击，不强制点击，不绕过遮挡。固定类别不包含异常原文或连接参数。

40 项离线测试通过，新增预检失败不点击、点击超时仍进入后续核验、诊断脱敏三项回归；不代表真实美团云端已适配成功。

覆盖原 applycheck 同名文件，不覆盖 .env、默认画像或旧 output，无需重新安装依赖。

```powershell
npm.cmd test
node cli.mjs discover --site meituan --limit 1 --out output/meituan-diagnostic-04
Get-Content .\output\meituan-diagnostic-04\click-attempts.json -Raw -Encoding UTF8
```

提供日志。失败时提供 click-01-before.txt，若有生成也提供 click-01.txt。如正文和截图仍读不到，可通过 Lexmount 控制台查看本次 session 录制核对真实页面动作。

官方参考：https://playwright.dev/docs/api/class-locator#locator-click
