# 0.1.1 修复补丁 · 2026-10-20

针对首次真实采集结果中的标题错误，修复“校招”导航被当成岗位名称的问题。保留原始正文、SHA-256、观察时间和 session 标识；当前岗位正文为新增派生字段，排除相关职位区块。修复已有数据是离线处理，不是新的官网采集。

## 安装

解压补丁，将 cli.mjs、repair-results.mjs、lib、tests、examples、docs 复制到原项目 applycheck 文件夹，替换同名文件。补丁不含 .env、config、package.json、package-lock.json 或 output，不修改密钥、用户配置、依赖或已有采集结果。无需重新 npm ci。

在原 applycheck 文件夹打开 PowerShell，执行：

```powershell
npm.cmd test
node repair-results.mjs --input output/first-live/001.json --out output/first-live-reviewed
Start-Process .\output\first-live-reviewed\report.html
```

预期 16 项离线测试通过；新报告显示“通用Agent评测运营实习生 - AI数据与安全”。用户条件尚未填写，因此“信息不足，待复核”仍为正常结果。原始 output/first-live 不变。

上传资料核验：001.txt 与 001.json 中的 body 完全一致，正文 SHA-256 匹配。页面包含职位描述、团队介绍、任职要求、投递控件和相关职位。当前只能证明该时刻读取到这些信息，并非已验证申请后续流程。

此次真实岗位的明确字段：本科及以上在读；实习至少三个月；每周五天。专业与技能部分仍由人工复核，原文有“专业不限”和具体专业背景描述，不将其自动化为单一专业门槛。

新增回归样本 examples/first-live-20261020.json 来自本次公开岗位采集，删除了 session 标识。它用于离线测试，不能据此声称执行了一次新的云端任务。

已验证：16/16 离线测试；使用用户提供的 001.json 成功生成修复报告；三项明确条件有原文依据。未在本环境执行新版本的真实云端采集，下一次 live run 还需复核。
