# 0.1.13 累积补丁：实习期不短于与20岗统一汇总

第三批5个不同岗位已真实采集成功，标题与原文一致，原文SHA-256均复核通过。累计有效不同岗位20个：字节16、美团4。失败空记录、5岗重复采集、离线测试画像和入口探测均不增加不同岗位数。

冻结首次有效结果：examples/batch-03-frozen-20261021.json保留规则0.1.8原判断及原始正文（session_id分发时移除）。东南亚电商钱效&资源管理原文“实习期不短于4个月”未识别，只记录通用3个月项目要求。当前用户画像实习6个月且非在校，最终不匹配仍有在校原文依据，但时长提取有实质错误。

本次新增“不短于”显式下界识别，保留3个月项目说明及4个月岗位专属条件，汇总取最严格下界。优先项仍为偏好；工资条件仍不当作实习时长。补充年月日期“2026年4月起”不误作4个月时长的边界保护。规则版本更新0.1.13。

70项离线测试通过，覆盖真实冻结错误样本、时长3/4/6/未知边界、12个月、偏好/工资/日期语境。新增5岗原始采集结果不被修改；无需重新访问云端。

安装：覆盖原applycheck同名文件，不覆盖.env、默认画像和旧output，无需重新安装依赖。

```powershell
npm.cmd test
node repair-results.mjs --input output/bytedance-batch-03-retry-01/results.json --profile config/profile-graduated-2025.json --out output/bytedance-batch-03-reviewed
Start-Process .\output\bytedance-batch-03-reviewed\report.html
```

本包另含evaluation/reviewed-20/report.html及JSON/CSV统一汇总，按0.1.13对用户已提供20个岗位原文离线重分析。原始时间、URL、正文和哈希保留，session_id分发副本置空，用户本地原文件不改。统一画像下17岗明确不匹配、3岗信息不足。该报告是自动重分析，仍需人工复核，不将20份已保存有效记录称为20/20全历史任务成功率。

```powershell
Start-Process .\evaluation\reviewed-20\report.html
```
