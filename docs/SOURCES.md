# 参考来源与来源边界（2026-10-19）

## 官方规则与接入

- 活动：https://browser.lexmount.cn/events/real-task-challenge
- 接入：https://browser.lexmount.cn/quick-start
- Node SDK：https://browser.lexmount.cn/docs/nodejs-sdk/quickstart
- 官方评测：https://github.com/lexmount/browseruse-agent-bench

已实际安装 lexmount 0.6.1 和 playwright 1.63.0，并检查 SDK 类型签名中的 sessionId/connectUrl/recording。未实际创建 Lexmount 云端 session，原因是本环境没有项目凭据。

## 已读取的招聘入口

- 字节列表：https://jobs.bytedance.com/campus/position
- 字节项目说明：https://jobs.bytedance.com/campus/page-6272Gc
- 美团校园招聘：https://zhaopin.meituan.com/web/campus
- 腾讯国内校园招聘：https://join.qq.com/
- 腾讯全球招聘 FAQ：https://careers.tencent.com/m/zh-cn/faqdetail.html

以上公开页面调研使用网页检索和 Firecrawl，不能冒充 Lexmount 的比赛运行成果。岗位详情链接由实际列表链接取得，而非生成职位 ID。链接可能随时间失效。

调研发现：字节列表混合正式岗位、日常实习与 ByteIntern；美团页面混合多种校招项目且卡片不一定有静态 href；腾讯国内校招入口与全球招聘站点不同。因此适配必须标注招聘项目和地区。

## 借鉴项目

- https://github.com/browser-use/browser-use ：多步浏览器任务思路。
- https://github.com/Skyvern-AI/skyvern ：网页工作流与过程记录思路。
- https://github.com/dgtlmoon/changedetection.io ：变化记录与条件触发思路。
- https://github.com/assafelovic/gpt-researcher ：来源关联与核验报告思路。
- https://github.com/microsoft/markitdown ：未来附件解析参考，当前未集成。

当前代码为本项目实现；未把上述项目源码复制为作品。后续如复用源码或组件，按具体许可证补充归属与必要声明。高星不等于适配完成；本活动未查到往届获奖作品，未以此作为选题依据。
