# 0.1.7 累积补丁与美团三岗位配置

新增 config/meituan-batch-02.json：用户提供的三个真实官网地址，公开页面核对名称分别为智能商业分析师（BA/DS）（应届）、HR实习生（招聘方向）（日常实习）、实习-餐饮类客户美工设计-成都&北京（日常实习）。配置来源标为手工提供，未声称自动发现。

修正美团“岗位基本要求”标题的详情识别，以及该标题结束偏好段落；支持 CLI 与离线修复读取带 BOM 的 JSON。保留非法 JSON 报错。42 项离线测试通过。

原有美团点击发现失败仍未解决；本包走直接详情 URL 采集。HR 页面明确写28届及以后，2025年毕业不符，当前规则不自动解释两位年份，不能把信息不足当作满足，采集后应人工核验。设计岗位未明确毕业年份或在校状态，不能仅因名称为实习就推断在校硬门槛。

安装：解压覆盖原 applycheck 同名文件，无需重新安装依赖，不覆盖 .env、默认 profile 或历史 output。

```powershell
npm.cmd test
node cli.mjs collect --targets config/meituan-batch-02.json --profile config/profile-graduated-2025.json --limit 3 --out output/meituan-batch-02
```

出现结果报告后再运行：
```powershell
Start-Process .\output\meituan-batch-02\report.html
explorer .\output\meituan-batch-02
```

提供终端输出和该目录的 results.json。完整云端结果尚待本次运行，不把公开网页查询作为Lexmount任务成果。
