# 0.1.11 累积补丁：快照比较区分岗位正文与附属内容

用户完成2026-10-20至2026-10-21隔日重复读取同一批字节5岗。重新采集全部成功，原文哈希复核通过。逐行对照确认5份原文差异均发生在“相关职位”区，当前岗位job_body全部一致；同规则0.1.8、同2025毕业画像下的条件和结论保持一致。

原compare已提示页面正文可能包含无关变化，本次进一步自动分类：双方均为有效详情，提取版本相同且原文/岗位正文哈希完整时，原文改变而岗位正文未变标为auxiliary_only（页面附属内容改变，岗位正文未变）；岗位正文改变标为job_body_changed（仍需复核具体语义）；正文缺失、读取失败、哈希不符或提取版本不一致保留unclassified待复核。规则版本变化单独说明，不直接归因于招聘内容变化。附属区变化仍保存记录，不修改原始证据。

63项离线测试通过，包含本次真实5岗重复快照及岗位正文变动、版本不一致、数据不完整等边界。已离线运行实际CLI，5项均输出auxiliary_only。未新增云端采集，不把重复5岗计为新增岗位。累计不同岗位仍为15个。

覆盖原applycheck同名文件，无需重新安装依赖，不覆盖.env、默认画像、历史output。安装后只需离线比较：

```powershell
npm.cmd test
node cli.mjs compare --before output/snapshot-baseline-01/results.json --after output/snapshot-repeat-01/results.json --out output/snapshot-repeat-01/changes-reviewed.json
Get-Content .\output\snapshot-repeat-01\changes-reviewed.json -Raw -Encoding UTF8
```

无需再运行collect。
