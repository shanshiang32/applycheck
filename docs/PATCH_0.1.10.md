# 0.1.10 累积补丁：字节 AI 求职搭子介绍窗

真实入口试跑0.1.9被介绍窗遮挡，预检报pointer_intercepted=true，click_attempted=false。用户上传截图和正文确认遮挡源为“你的AI求职搭子来了”，按钮为“稍后再说”与“立即体验”，并非登录页或验证挑战。

仅在jobs.bytedance.com、正文同时出现已观察介绍标题/个性化荐岗/稍后再说、且关闭文字唯一可见时，点击“稍后再说”一次。支持该窗在预检期间延迟出现：首次预检被遮挡且尚未尝试实际投递点击时，可关闭介绍窗后再预检。最多一次实际投递点击；不强制穿透遮挡，不点击立即体验，不填写或提交申请。关闭动作记录在ui_actions，预检过程记录preflight_attempts。

59项离线测试通过，包括真实介绍窗正文回归、延迟弹窗、关闭控件歧义及域名范围。新处理尚待Lexmount真实试跑，不能据此认定入口已核验成功。上次失败不应计入新增岗位或成功入口。

覆盖原applycheck同名文件，不覆盖.env、默认画像或旧output，无需重新安装依赖。包含此前累积补丁和评估记录。

```powershell
npm.cmd test
node cli.mjs verify-entry --targets config/bytedance-next-05.json --limit 1 --out output/entry-probe-02
Get-Content .\output\entry-probe-02\entry-results.json -Raw -Encoding UTF8
```

提供终端及JSON输出。如果待复核，先看ui_actions、preflight_attempts及现场文件，避免重复运行云端探测。
