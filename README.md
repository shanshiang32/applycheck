# 投前核验 ApplyCheck · Lexmount 参赛项目

目标：帮求职者核对实习岗位的明确门槛、页面状态和申请入口，并为每个判断留下原文依据。

**当前状态**：已完成 Lexmount 云端真实采集 20 个不同岗位（字节 16 + 美团 4），统一离线重分析为 17 岗明确条件不匹配、3 岗信息不足待复核；入口核验停在登录前。规则版本 0.1.13，70 项离线测试通过。详见 [`submission/`](./submission/)。

> 投稿材料与官方要求核对见 [`submission/OFFICIAL_REQUIREMENTS.md`](./submission/OFFICIAL_REQUIREMENTS.md)；发布到 GitHub 与投稿操作见 [`GITHUB_SUBMISSION.md`](./GITHUB_SUBMISSION.md)。

## 先看效果（不需要密钥，也不需要安装依赖）

安装 Node.js 20 或以上，解压后在 `applycheck` 文件夹打开 PowerShell：

```powershell
node cli.mjs demo
Start-Process .\output\demo\report.html
```

演示中的企业、岗位和求职条件都是合成数据，页面带有明显标记，不能作为比赛结果提交。

## 第一次真实运行

1. 在 https://browser.lexmount.cn/events/real-task-challenge 完成本人报名。官方当前说明 Free 账号报名后可领取 2 个月 Pro，实际以你的账号页面为准。本人身份、报名与授权由本人完成。
2. 在 https://browser.lexmount.cn/settings/api-keys 创建 API Key，取得同项目的 Project ID。
3. 执行以下命令。依赖固定为本次官方 SDK 文档所列版本，并保存了 package-lock.json。

```powershell
npm ci --ignore-scripts
Copy-Item .env.example .env
notepad .env
```

在你自己的 `.env` 中填入 Key 和 Project ID。不要把密钥发到聊天、截图、GitHub 或比赛材料。

4. 检查本地配置：

```powershell
node cli.mjs doctor
```

`ready_to_attempt_cloud: true` 只表示依赖和环境变量存在；**不代表云端鉴权成功**。

5. 完成第一条云端任务，控制数量以便排查：

```powershell
node cli.mjs collect --limit 1
```

结果保存到 `output/run-时间/`。默认使用 3 条 2026-10-19 在字节官网列表中查到的真实详情链接，状态尚未实测。初始 profile 全为空，因此不会擅自判断你符合条件。

6. 将你的实际条件填入 `config/profile.json`，或复制一个新配置后通过 `--profile` 指定。支持学历、毕业月份、可实习月数和每周天数，未知项保留 null。城市、专业和技能首版由人工确认。

```powershell
node cli.mjs analyze --input output/run-实际时间/results.json
```

重新分析只读取既有正文，不会冒充再次访问官网。

## 发现和比较岗位

```powershell
node cli.mjs discover --site bytedance
node cli.mjs collect --targets output/discover-实际时间/targets.json --limit 3
node cli.mjs compare --before output/run-第一次/results.json --after output/run-第二次/results.json
```

当前发现器只跟随列表上真实存在的详情链接，不猜测职位 ID，不调用未公开接口。首版仅读取首个列表页面，不自动分页或过滤关键词。美团和腾讯卡片可能没有 href，配置是待适配入口，不能声称三站已经支持。

## 已实现

- Lexmount Chromium session + Playwright CDP 接入，默认保留平台回放。
- 列表链接发现、允许范围校验、岗位正文、公开页截图和操作摘要。
- 每条岗位独立保存 JSON/TXT，提供 SHA-256 正文摘要及核验时间。
- 明确学历、最低时长、每周天数和毕业年月区间的证据化规则初筛。
- 区分硬门槛和“优先”；用户条件未知与网页条件缺失均保留待确认状态。
- HTML 可筛选报告、CSV 清单、JSON 原始记录、两次观察的变化比较。
- 正常或异常结束后分别尝试关闭连接和云端会话。

## 必须完成的后续工作

- Lexmount 首次鉴权和首条真实任务验证。
- 三家站点的搜索、实习类型、关键词筛选、详情与分页适配。
- 申请入口后续流程核验：目前只观察可见控件，没有点击投递。入口可见不等于可申请。
- 专业、城市、技能及特殊招聘项目规则复核；复杂自然语言抽取与置信度设计。
- 至少两次真实采集、人工标注样本、准确率/耗时/成本统计。
- 录屏、技术说明、案例摘要与投稿材料。

## 如何解释输出

“已识别的硬条件匹配”仅指规则识别到的四类条件。学历、技能、在校状态、地区、招聘项目等仍可能存在其他要求；不表示符合全部条件或必然获录用。

“未观察到入口”“访问失败”和“本次未采集到”均不等于岗位下架；只有页面明确提示关闭时，才记录该页面观察。

原文引用和哈希可以帮助核查与发现文件变化，不能单独证明网页历史或生成时间。投稿需结合 Lexmount session 记录、可用回放和人工抽样。

## 测试

```powershell
npm test
```

不需要模型 Key 或云端浏览器。测试覆盖误判风险、缺失条件、月份混淆、变化判断与输出转义。

## 目录

- `cli.mjs`：命令行入口。
- `lib/browser.mjs`：Lexmount 连接与公开页采集。
- `lib/analyze.mjs`：条件抽取、规则判断、变化比较。
- `lib/report.mjs`：HTML/CSV/JSON 输出。
- `config/`：待填写用户条件、站点配置、第一批候选链接。
- `docs/`：实施计划、评估方案、当前进度和参考来源。
- `examples/`：合成案例。
- `tests/`：离线测试。

本包未附带依赖目录、账号密钥或已登录浏览器数据。Node 与 npm 环境由你本地提供，无须下载本地 Chromium，实际浏览器由 Lexmount 创建。
