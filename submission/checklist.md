# 最终提交清单

> 状态：✅ 已完成 · ⏳ 需用户录制/上传 · ❓ 未核实

## 代码与产物（已完成，随包交付）

- ✅ 项目源码（`cli.mjs`、`lib/`、`config/`、`tests/`、`repair-results.mjs`）
- ✅ 统一 20 岗离线报告 `evaluation/reviewed-20/`（report.html / results.json / results.csv）
- ✅ 人工复核工作台 `evaluation/manual-review/review-20.html`（及其 build/check/score 脚本）
- ✅ 原始采集结果 `output/*/`（含 session 追溯，公开分发版已移除 session_id）
- ✅ 规则版本 0.1.13、入口探测 0.1.10；70 项测试通过

## 本次收尾改动（已完成）

- ✅ 安装 poneytail 工程规范 skill（`.cursor/rules/ponytail.mdc` + `ponytail.skill.md`，MIT 许可，DietrichGebert 原创）
- ✅ 修复 AI/人工来源混淆：`evaluation/manual-review/core.mjs` + `score.mjs` 按 `review_mode` 区分，AI 自动复核不计入“人工完成”
- ✅ 报告补画像与状态汇总：`lib/report.mjs` 展示固定画像 + 三档状态（条件初筛/页面读取/入口核验，入口细分“已触发核验 / 仅发现入口未触发”）
- ✅ 清理冗余：删除/备份 `evaluation/evaluation`（双层嵌套）与根目录误放置的 `ApplyCheck_manual_review_20`
- ✅ 建立 `submission/` 材料目录

## submission 材料（已完成）

- ✅ `README.md`（项目说明 + 复现指南）
- ✅ `OFFICIAL_REQUIREMENTS.md`（官方要求 vs 自选展示方案，2026-10-26 核对）
- ✅ `evaluation.md`（评测口径、20岗范围、17/3 结果、AI复核口径、局限性）
- ✅ `usage.md`（17会话 / 0.237浏览器小时 / 第三批5岗64秒，取证日期与范围）
- ✅ `demo-script.md`（3分钟演示脚本 + 录屏核对清单）
- ✅ `form-material.md`（可复制到表单的简介/创新点/技术方案/成果/局限）
- ✅ `failures-and-fixes.md`（主要失败案例与改进）
- ✅ `checklist.md`（本清单）

## 官方时间节点（2026-10-26 核对）

- ✅ 报名/投稿/修改截止：2026-11-08 23:59（北京时间）
- ✅ 结果公示：2026-11-14 20:00
- ✅ 内部完成目标：2026-10-31（早于官方截止）

## 演示视频（已完成）

- ✅ 演示视频已生成为**矢量风格视频**：`media/applycheck-demo.mp4`（68.000s / 1920×1080 / 30fps / H.264 / 4.16 MB / 2040 帧）
- ✅ 附矢量海报 `media/applycheck-poster.svg` 与两张静帧 PNG
- ✅ 生成器与源文件：`tools/vector-video/{frame.html, render.mjs, README.md}`，改数据可一键重渲染
- ✅ 校验：ffprobe 帧数与时长精确；抽帧 PSNR 36.8–38.8 dB；12 个时间点文本可见性审计通过
- ✅ **替代**此前约 81 秒 / 157.88 MB 的屏幕录制（体积约 1/38，正式提交以本视频为准）

## 需用户上传（未完）

- ⏳ 到官方 `/events/real-task-challenge/submit` 表单投稿
- ⏳ 群内/表单要求的账号授权、报名与身份信息（本人完成）
- ✅ AI 复核文件已接入（`evaluation/AI_review_20.json`，来自你提供的 `D:\engine\ApplyCheck_AI_review_20.json`；已核对 fingerprint 与 20 岗数据集一致，来源正确标识为 AI 自动复核）

## 未核实 / 明确不声称

- ❓ 实际人民币费用（仅有本周期项目累计用量，不估算费用）
- ❓ 独立人工评测（未完成，不提供精确率/召回率/节省时间）
- ❓ 符合条件（可匹配）的真实对照岗位（20 岗全为不匹配/信息不足）
- ❓ 往届获奖情况、评分标准细则（官方活动页 FAQ 未公布，不编造）
- ❓ 投稿表单的具体字段、文件格式与大小限制（尚未实际登录核对，以表单实际为准）

## 交付包

- ✅ 可复现包（不含 `.env`、密钥、node_modules、登录状态、个人账号截图、无关临时文件），打包与验证说明见 `../PACKAGING.md`（或随附说明）。
