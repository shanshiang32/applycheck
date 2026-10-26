# ApplyCheck / 投前核验 · Lexmount 真实任务挑战赛 提交说明

> 官方活动（2026-10-26 核对）：报名、投稿及修改均于 **2026 年 11 月 8 日 23:59（北京时间）** 截止；**11 月 14 日 20:00 公示结果**。官方要求摘要见 [OFFICIAL_REQUIREMENTS.md](./OFFICIAL_REQUIREMENTS.md)。
> 内部完成目标仍为 **2026-10-31**（早于官方截止）。
> 本目录是「公开分发材料」：不包含 `.env`、API Key、个人登录状态、原始 session 标识或账号截图。

---

## 一、一句话简介

**投前核验（ApplyCheck）**：用 Lexmount 云浏览器自动读取实习岗位详情页并保存带哈希的原文证据，提取学历/在校状态/实习时长/每周出勤/毕业时间这五类“硬门槛”，与求职者画像比较，**区分「明确条件不匹配」与「信息不足待复核」**，再核验投递入口（停在登录前，不自动投递），并支持隔日快照比对、把「相关职位等附属内容变化」和「岗位正文变化」分开记录。

## 二、解决的真实问题

求职者投递前，招聘页普遍包含优先项、相关职位推荐、登录入口和动态内容，仅靠肉眼很容易误判：

1. **优先项被当成硬门槛**——“4 个月实习优先”不是硬要求，但“每周 4 天”是硬要求，两者常在同一句里。
2. **同句里学历与专业优先纠缠**——“本科及以上学历在读，计算机等相关专业优先”，不能因为“专业优先”就放松“本科在读”的硬门槛。
3. **多条时长要求口径不一**——通用说明 3 个月、岗位专属要求 6 个月，应取最严格值而非被 3 个月带偏。
4. **毕业时间信息不完整时不贸然下结论**——毕业年份已知、月份未知时，不擅自猜 6 月，按区间保守比较。
5. **页面读取失败、岗位关闭、未再采集**是三种不同状态，不能混淆为“岗位已下架”。
6. **投递入口**——入口可见不等于可申请；真实点击后停在登录页，不填写、不提交、不上传、不请求验证码。

## 三、目标用户

面向正在海投实习/校招岗位的求职者，尤其是需要快速判断“这个岗位我到底能不能投”的人；也作为可审计的核验工具，给每个判断留下原文依据。

## 四、工作流程

```
官网岗位发现 / 手动提供链接
  → Lexmount 云浏览器读取详情（保留原文 + SHA-256 + 时间）
  → 提取当前岗位正文（排除相关职位等附属内容，校验标题）
  → 提取硬条件（学历 / 在校 / 时长 / 出勤 / 毕业范围）
  → 与画像比较（明确不匹配 / 信息不足 / 已识别硬条件匹配）
  → 生成 HTML / JSON / CSV 报告（可筛选，含证据展开）
  → 核验投递入口（真实点击 1 次 → 停在登录/表单，不自动投递）
  → 隔日快照比对（区分岗位正文变化 vs 附属内容变化）
```

## 五、Lexmount 的作用与价值

- 使用 Lexmount 云浏览器（Chromium）创建云端会话，通过 Playwright CDP 接入真实详情页，保留平台回放。
- 核心价值是**可审计**：每条判断都有官网 URL、采集时间、原文、正文 SHA-256 和（真实运行时可关联的）session/回放，让“判断”可追溯、可复核。
- 入口核验最多真实点击 1 次投递控件，停在登录前，不填写申请、不上传简历、不请求验证码、不完成登录、不提交申请。

## 六、技术方案要点

- Node.js（>=20）+ `lexmount`（0.6.1）+ `playwright`（1.63.0，锁文件为准）。
- 规则版本 0.1.13，入口探测版本 0.1.10。`package.json` 版本号仍为 0.1.0（已知情况，以锁文件与测试为准）。
- 模块：`lib/browser.mjs`（会话/采集/释放）、`lib/normalize.mjs`（提取当前岗位正文）、`lib/analyze.mjs`（条件提取+比较）、`lib/report.mjs`（HTML/JSON/CSV）、`lib/entry.mjs`（入口探测）、`lib/meituan.mjs`（美团适配）、`lib/targets.mjs`（采集前校验）、`lib/json.mjs`（BOM 兼容）。
- **70 项离线测试全部通过**（不依赖模型 Key 或云端浏览器）。
- 判断铁律（节选，完整见 `lib/analyze.mjs`）：
  - 优先/加分/更佳 ≠ 硬门槛；“相关专业优先”不降低同句学历硬要求。
  - 同句时长与出勤分别判断硬条件与偏好；“4—5 天”取下界 4；“不短于 4 个月”是硬下界。
  - 多条硬下界取最严格值；未明确在校要求时，不从“实习”岗位名推断。
  - 已毕业者可学历达标但不满足“学历在读”；毕业年份已知、月份未知时不猜 6 月。
  - “28 届及以后”在教育语境解释为 2028 届起并注明；单独某届/模糊表述不擅自推断范围。

---

## 七、复现指南（Windows PowerShell）

### 1. 安装依赖

```powershell
cd applycheck
npm ci --ignore-scripts
```

### 2. 私下配置 `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

填入你自己的 `LEXMOUNT_API_KEY` 和 `LEXMOUNT_PROJECT_ID`（不要把密钥发到聊天、截图、GitHub 或比赛材料）。

### 3. 本地检查（不访问云端）

```powershell
node cli.mjs doctor
```

`ready_to_attempt_cloud: true` 只表示依赖和环境变量存在，**不代表云端鉴权成功**。

### 4. 离线演示（不需要密钥、不需要云端）

```powershell
node cli.mjs demo
Start-Process .\output\demo\report.html
```

演示里的企业、岗位和条件都是**合成数据**，带明显标记，不作为比赛成果。

### 5. 可选真实运行（需账号授权，会消耗云端用量）

```powershell
node cli.mjs collect --limit 3
node cli.mjs analyze --input output/run-实际时间/results.json --profile config/profile-graduated-2025.json
node cli.mjs verify-entry --targets config/targets.json --limit 1
node cli.mjs compare --before output/run-第一次/results.json --after output/run-第二次/results.json
```

### 6. 统一 20 岗离线报告（不重新访问官网）

```powershell
Start-Process .\evaluation\reviewed-20\report.html
```

### 产物位置

- 统一报告：`evaluation/reviewed-20/{report.html, results.json, results.csv}`
- 人工复核工作台：`evaluation/manual-review/review-20.html`
- 原始采集结果：`output/*/`
- 重新分析（保留原文的离线重分析）：`output/*-reviewed/`

---

## 八、评测口径（务必准确，不夸大）

见本目录 [`evaluation.md`](./evaluation.md)。
