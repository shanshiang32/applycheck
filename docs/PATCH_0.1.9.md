# 0.1.9 累积补丁：申请入口后续页面核验

本次新增 verify-entry 独立命令，与collect及用户资格判断分开。限定1—3岗，默认1岗；每岗核对官网详情、目标岗位名和要求标题，定位唯一可见可用入口。只对投递/立即申请等白名单标签进行一次真实点击；可点击性预检不触发点击。真实点击超时只观察结果，不重试点击。

识别后续可见密码/手机号认证输入框、新增明确登录提示、带简历上传的申请表单或官网范围外跳转；保留待复核状态。导航栏“登录”二字不会单独判为进入登录页。停在后续页面，不输入、不上传、不请求验证码、不完成登录或提交申请。使用本项目新建云端session，不复用用户个人登录。

每次生成 entry-results.json、entry-report.html、逐岗位*-entry.json、可取得的点击前后正文和截图。后续URL仅保留已知公开岗位参数，剔除其他查询及片段；异常只记录固定类型/类别，不保存原始连接错误。已填写字段出现时停止保存后续正文和截图。跨配置官网域名导航被拦截并如实记录，不自动扩大导航范围。

此次是技术入口探测，不代表用户符合资格，也不向岗位实际提交申请。入口报告独立保存，未回写旧collect结果。即使确认需要登录，也只能声称进入了认证阶段。

54项离线测试通过，含状态分类、单次点击、点击超时、目标不符不点击、输出转义等回归。尚未通过Lexmount真实运行本新命令，不能声称已实现云端入口核验成功。

## 安装和首次试跑

解压覆盖原applycheck同名文件，无需重新安装依赖。不包含.env、默认画像或历史output。本包累计包含此前修复及最新评估记录。

```powershell
npm.cmd test
node cli.mjs verify-entry --targets config/bytedance-next-05.json --limit 1 --out output/entry-probe-01
Get-Content .\output\entry-probe-01\entry-results.json -Raw -Encoding UTF8
```

先提供终端和JSON输出；无需上传截图或填写任何账号信息。出现入口报告后，可打开：

```powershell
Start-Process .\output\entry-probe-01\entry-report.html
```

## 人工抽查范围

已记录用户回复“核对一致”：区域政策运营的6个月、5天、在读要求；千川营销数科未明确出勤。只确认上述字段，不将剩余模型初审标签自动标为人工确认。

官方API参考：https://playwright.dev/docs/api/class-locator#locator-click 。当前click的noWaitAfter虽标为deprecated仍具备导航等待控制作用；独立观察流程保留该选项用于远程CDP场景。
