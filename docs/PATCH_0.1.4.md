# 0.1.4 累积补丁：美团岗位卡片点击探测

## 当前证据

用户通过 Lexmount 获得的美团校园招聘页面已正常加载。保存的正文能识别十张岗位卡片，其中五条为日常实习；原链接扫描器输出零条详情地址。不能把这个结果解释为没有岗位或平台不可访问。

新增能力：按已观察的列表结构识别实习卡片，再通过网页点击实习岗位标题，处理同页跳转或新标签页，记录真实详情地址。详情需同时满足允许的官网域名、不同于列表的 URL、目标岗位标题及任职要求等内容；不编造详情链接，不直接请求隐藏接口，不点击投递。

解析与基本校验已通过离线测试；**尚未在本环境通过 Lexmount 执行真实美团点击流程，必须完成用户下一次小规模试跑才能声称适配成功。** 当前只处理列表首屏，尚未实现筛选、分页或同 URL 详情弹窗。

## 安装与运行

将补丁内全部文件复制进原 applycheck 文件夹，替换同名文件。本包包含 0.1.1—0.1.3 的修复，不包含 .env、不覆盖默认 profile 或旧 output，无需重新安装依赖。

```powershell
npm.cmd test
node cli.mjs discover --site meituan --limit 3 --out output/meituan-discovery-02
```

预期离线测试 36 项通过。真实运行逐个打印美团点击结果。只有出现已核验详情地址后，再运行：

```powershell
node cli.mjs collect --targets output/meituan-discovery-02/targets.json --profile config/profile-graduated-2025.json --limit 3 --out output/meituan-batch-01
Start-Process .\output\meituan-batch-01\report.html
```

若发现零条地址，先不要运行 collect。提供终端输出、click-attempts.json 和生成的 click-01.txt 即可诊断。可截图公开岗位页面，不提供密钥或个人账号页面。

## 证据与限制

click-attempts.json 保存候选岗位、点击结果及可验证地址，click-XX.txt 为点击后页面正文。若同名标题存在歧义、点击超时、页面无法加载或详情仍在原 URL，保留失败，不算作已支持。云端 session 结束后检查控制台确认会话关闭。

本次用到的公开页面结构参考用户上传 000.txt；回归样本仅保存文本，不把上传截图作为新交付材料。

Playwright 官方参考：https://playwright.dev/docs/pages 、https://playwright.dev/docs/locators 。使用 getByText 定位实际观察到的标题，监听 popup 事件处理新页面。

36/36 是代码测试结果，不是实际云端点击成功率，也不是招聘资格判断准确率。
