# 0.1.12 累积补丁：采集前验证目标配置与预制5岗列表

本次用户上传batch-03结果仅1条空记录，缺少URL、公司、标题，http_status=null、原文为空、访问失败。不能计为新增有效样本，当前不同有效岗位仍15个。此前PowerShell配置生成写法可能导致数组嵌套，现有结果不足以单独还原旧配置结构，但可确定其未提供有效岗位对象。

新增validateTargets，在collect及verify-entry创建云端session前检查：非空数组、每项必须为独立对象、有公司、岗位名称、允许域名及有效HTTPS官网URL。嵌套数组、空值、缺失URL提前报明确信息，不静默展平，不创建云端session。

预制config/bytedance-batch-03.json，直接从用户实际发现targets.json第1、2、4、5、6项保存，保持原始来源说明。无需再运行PowerShell配置生成命令。5个URL唯一且经去重，均未在此前15个岗位中采集。

67项离线测试通过，新增配置拒绝、HTTPS范围校验、5对象检查及实际CLI两个入口的启动前拒绝测试。本补丁不声称这5个详情已采集成功。

覆盖原applycheck同名文件，尤其config/bytedance-batch-03.json、cli.mjs及lib/targets.mjs。不覆盖.env、默认画像和历史output，无需重新安装依赖。

```powershell
npm.cmd test
node -e "const fs=require('node:fs');const rows=JSON.parse(fs.readFileSync('config/bytedance-batch-03.json','utf8'));console.log('Targets:',rows.length);console.log(rows.every(r=>!Array.isArray(r)&&typeof r.url==='string'));"
```

应为67项通过、Targets: 5、true。之后运行新的目录，保留上次失败结果：

```powershell
node cli.mjs collect --targets config/bytedance-batch-03.json --profile config/profile-graduated-2025.json --limit 5 --out output/bytedance-batch-03-retry-01
explorer .\output\bytedance-batch-03-retry-01
```

上传新目录results.json和终端输出。新采集成功与否如实记录，失败尝试不从评估记录删除。
