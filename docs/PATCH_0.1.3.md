# 0.1.3 累积补丁：在校状态与毕业年份

包含前两个补丁。安装时复制全部内容进原 applycheck 文件夹并替换同名文件；不含 .env，不修改默认 config/profile.json 或已有 output。

本次画像按用户所写的“北邮硕士，2025年毕业，可连续实习6个月，每周五天”建立。is_student=false 是按“已毕业”理解，未推测具体毕业月份。若实际指 2025 年入学，请先纠正画像，再解释结果。

新增 requires_student 字段，带原文证据判断在校状态；仅有硕士学历不代表在校。毕业时间可只填写 graduation_year；与要求区间完全错开才判不匹配，边界年份部分重叠则仍需毕业月份。学校名称不参与门槛评分。

在本批 5 条真实岗位的保存正文上离线验证：5 条均明确要求在校/在读，两个 ByteIntern 岗位还要求 2026-09 至 2027-08 期间毕业。因此按 2025 年已毕业画像，5 条均为“明确条件不匹配”。这不表示账号无法访问页面，亦不表示岗位已关闭。

## 在原项目运行

```powershell
npm.cmd test
node repair-results.mjs --input output/batch-01/results.json --profile config/profile-graduated-2025.json --out output/batch-01-profile-2025
Start-Process .\output\batch-01-profile-2025\report.html
```

预期 31 项代码测试通过；五条报告显示明确条件不匹配。展开详情可见学历、月数、天数符合的项，以及在读状态不符的项；两个 ByteIntern 岗位同时显示毕业年份不符。

原始采集时间、正文和正文哈希均保留。此次画像核验为离线重新分析，未重新访问官网、不消耗云端额度。当前代码测试通过数不等于真实网页判断准确率。

后续若想在真实采集中采用此画像，collect 命令同样传入 --profile config/profile-graduated-2025.json。默认 profile 保持为空，避免静默修改用户配置。
