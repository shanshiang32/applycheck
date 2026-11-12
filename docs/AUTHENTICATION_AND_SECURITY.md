# 认证、请求流程与安全审查

审查基线：main 9301a661390186560a7f666c8a4efdc41caf2aa9；2026-11-12。

## 组件与请求流

本项目是 Node.js CLI 加静态报告，没有自建账号系统、登录接口、密码库、JWT、刷新令牌或用户会话服务器。

1. `cli.mjs` 在项目目录读取 `.env`，仅填充未在进程环境设置的变量；`doctor` 只输出凭据是否存在，不执行鉴权。
2. `lib/browser.mjs` 的 `cloudSession()` 检查 `LEXMOUNT_API_KEY` 和 `LEXMOUNT_PROJECT_ID`，通过 `new Lexmount()` 交给固定版本 SDK 读取。
3. 已安装的 `lexmount@0.6.1` 在 `dist/index.mjs` 的请求实现中发送 `x-api-key` 和 `x-project-id`；隧道请求也使用项目 ID/API Key，WebSocket 隧道连接使用 `Authorization: Bearer <ticket>`。这是 SDK 的服务认证，不是本站用户登录。
4. SDK 创建云会话并返回 `connectUrl`，Playwright `chromium.connectOverCDP()` 接入浏览器。连接地址应视为敏感凭据，不写入报告或日志。
5. `capture()` 读取公开页面；`verifyEntry()` 观察投递入口并在登录/表单处停止。招聘网站自己的 Cookie、登录密码和验证码不由本项目读取或保存为认证配置；浏览器会自然处理访问中站点设置的 Cookie。
6. finally 分别关闭浏览器、云会话、SDK；不实现应用层 token 缓存、刷新或吊销。API Key 轮换应在服务控制台完成。

## 凭据与输出边界

`.env` 已被 `.gitignore` 排除，但排除规则不能撤回已泄漏的密钥。不要把真实 Key、带票据的连接 URL、浏览器存储状态放入仓库。异常处理避免输出底层 SDK 原文。JSON/TXT/截图与平台持久录制仍可能含网页个人信息，公开前必须审阅；本工具不是通用隐私脱敏器。

`allowedUrl()` 只允许目标配置中的精确 HTTPS 主机，拒绝用户密码和非标准端口。该约束主要用于导航，不是所有子资源请求的完整网络隔离或 SSRF 防护；目标配置应来自可信操作者。页面跳转至未允许域名会阻断。

## 本次修复与验证

- 锁文件更新 `follow-redirects`，修复 npm audit 报告的高危凭据重定向漏洞 GHSA-mrwp-f3q8-3g9p；未更换 Lexmount 与 Playwright 的直接版本。
- CSV 导出补上前导空白及换行后的公式注入防护，避免仅检测首字符造成绕过。
- 官网 URL 校验拒绝非 443 端口，防止允许主机上的其他端口服务被当成招聘官网。
- 新增回归测试覆盖端口、CSV 公式以及 HTML 标题转义。

验证：72 项离线测试通过，npm audit 为 0 已知漏洞。未使用真实密钥执行云端鉴权或新采集；这次检查不等于全面渗透测试，也不能保证不存在未知漏洞。
