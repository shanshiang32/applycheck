# 0.1.8 累积补丁：真实美团三岗位回归

本次用户真实云端采集三岗均读取成功，HTTP 200，标题与正文一致，原文 SHA-256 全部复核通过。HR 原文“28届及以后的本科或研究生”“每周保障出勤4-5天”暴露规则缺口。

改动：仅对带明确“及以后/之后/以上”等年份下界、且同一子句包含学历或学生语境的届别识别 graduation_min_year。两位届别按2000年代展开，保留原文和解释，不猜毕业月份；单独某届仍待复核。识别本科或研究生的学历下界。出勤4-5天提取至少4天；优先项仍为偏好，倒置范围不猜。识别具备以下条件优先为偏好段落，岗位亮点结束该段落。

46 项离线测试通过。使用用户原始上传结果运行离线修复，输出为：
- 智能商业分析师（BA/DS）：信息不足，待复核。
- HR实习生（招聘方向）：明确条件不匹配，2025毕业不满足2028及以后。
- 实习-餐饮类客户美工设计-成都&北京：信息不足，待复核。

读取成功不等于符合招聘条件。申请按钮仍只记录可见，不代表申请流程核验成功。美团链接由用户手动取得，自动发现仍未打通。本次离线修复不产生新的云端采集成果。

安装：覆盖原 applycheck 同名文件，无需重新安装依赖，不覆盖 .env、默认 profile、原始 output。包含此前全部补丁。

```powershell
npm.cmd test
node repair-results.mjs --input output/meituan-batch-02/results.json --profile config/profile-graduated-2025.json --out output/meituan-batch-02-reviewed
Start-Process .\output\meituan-batch-02-reviewed\report.html
```

无需重跑 collect。原采集目录与修复后目录分别保留，便于参赛时展示原始证据、规则版本和修正依据。
