# AI 自动复核说明（`AI_review_20.json`）

> 本文件准确说明 `evaluation/AI_review_20.json` 的性质与口径，防止被误解为独立人工评测或产品准确率。

## 文件身份

- 路径：`evaluation/AI_review_20.json`
- `schema`：`applycheck-human-review-v1`（仅为兼容现有人工复核工作台）
- `review_mode`：`ai_automatic`（**真实来源**）
- `reviewer`：`"AI自动复核（非独立人工评测）"`
- `dataset_fingerprint`：`923815279e40563f129fcc73a345d6d8a2b9cbce3974bc69882eb95db7aaa356`（与 `evaluation/reviewed-20/results.json` 的 20 岗 URL + body_hash 完全一致）
- `cloud_calls: 0`（未重新联网采集，只读已保存原文）

## 它做了什么

对已保存的 20 岗提取消原文，逐岗复核五类硬条件：`min_degree` / `requires_student` / `min_months` / `min_days` / `graduation`。

## 与固定规则 0.1.13 的一致性（文件内嵌 `rule_comparison`）

| 项 | 值 |
|---|---|
| 复核岗位 | 20 |
| 字段槽位 | 100（20 岗 × 5 类） |
| 槽位一致 | 100 / 100 |
| 明确目标字段 | 65 |
| 明确字段一致 | 65 / 65 |
| 岗位结论一致 | 20 / 20 |
| 差异 | 无 |
| scope | “AI自动复核与固定规则0.1.13的一致性，不是独立准确率” |

结论分布（`summary`）：20 岗中 `rejected=17`（明确条件不匹配）、`insufficient=3`（信息不足待复核）。

## 必须明确的限制（防止误读）

1. **这不是独立人工金标准、不是盲测、不是“产品准确率 100%”。** AI 复核者是“同一项目开发过程中的 AI”，接触过程序规则和结果。原文引用与哈希虽经校验，但一致性只说明“AI 复核结果与程序规则结果一致”，不构成独立验证。
2. `ui_compatibility` 沿用 `completed=true` 仅表示“AI 已处理该岗”；**真实来源以 `review_mode` 与 `reviewer` 为准**，不得因 schema 名称或 `completed=true` 统计成“人工复核完成”。
3. 仅复核五类明确条件，未评估专业、技能、地点、语言、工作经验及其他任职要求；“未明确”不代表没有要求。
4. 20 岗全为“不匹配/信息不足”，没有符合条件（可匹配）的真实对照，无法衡量误拒率。

## 计分程序已按来源区分

`evaluation/manual-review/score.mjs`（及 `core.mjs` 的 `reviewMode()`）会：

- 读取 `review_mode`；`ai_automatic` → `ai`，缺失 → `human`。
- AI 复核**不计入**“已完成的人工作业标签”，`field_slots=0`，并在输出标注“AI 自动复核（不计为人工完成）”。

运行例：

```powershell
node .\evaluation\manual-review\score.mjs --input evaluation\AI_review_20.json --out evaluation\AI_review_metrics.json
# 输出：来源：AI 自动复核（不计为人工完成）；已完成 0/20 岗 …
```

> 注意：该命令对 AI 文件返回 `field_slots=0`，是**有意设计**——它表示“在人工评分口径下，AI 结果不参与分母”。AI 文件自身的“一致性”结果请以上表 `rule_comparison` 为准，不能用 `score.mjs` 去给 AI 文件“打分”成人工准确率。
