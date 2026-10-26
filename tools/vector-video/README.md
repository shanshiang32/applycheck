# 矢量演示视频生成器

把项目真实数据渲染成**矢量风格**的演示视频：所有画面由 HTML/SVG 绘制（文字与色块为矢量），
逐帧截图后编码为 mp4。不会出现屏幕录制的模糊、缩放失真或巨量体积。

## 为什么用矢量源而不是录屏

- 文字在任何分辨率下都清晰（源是矢量，非像素截图）。
- 每帧由 `render(t)` **确定性**生成，可精确复现、可重渲染。
- 文件小：68 秒 1080p 通常 5–15 MB，而同等长度屏幕录制可达 150 MB 以上。
- 内容直接取自 `evaluation/reviewed-20/results.json`、画像与用量等真实数据，不手搓数字。

## 产物

| 文件 | 说明 |
|---|---|
| `media/applycheck-demo.mp4` | 68 秒 · 1920×1080 · 30fps · H.264（yuv420p，通用可播） |
| `media/applycheck-poster.svg` | 纯矢量海报，无限缩放，可直接放网页/README |
| `media/applycheck-poster-title.png` | 标题镜静帧（2× 缩放） |
| `media/applycheck-poster-results.png` | 结果镜静帧（2× 缩放） |

## 用法

在仓库根目录执行（需要 `node_modules/playwright`）：

```powershell
npm ci --ignore-scripts
node tools/vector-video/render.mjs --out media/applycheck-demo.mp4 --fps 30
```

参数：

- `--fps`：帧率，默认 30。
- `--out`：输出 mp4 路径。
- `--channel`：浏览器通道，默认 `chrome`（依次可试 `msedge`）。

## 场景时间轴（共 68 秒）

| 时间 | 场景 |
|---|---|
| 0–4s | 标题：每一项判断都有原文依据 |
| 4–11s | 投递前的六个误判风险 |
| 11–17s | 固定测试画像 |
| 17–24s | 20 岗结果：17 / 3 / 0 |
| 24–31s | 案例：学历达标但「学历在读」不满足 |
| 31–37.5s | 案例：优先项不当硬门槛（4—5 天取 4） |
| 37.5–42.5s | 信息不足不猜测 |
| 42.5–48.5s | 入口核验停在登录前 |
| 48.5–54s | 隔日快照：只改附属内容 |
| 54–59.5s | 证据链与平台用量 |
| 59.5–64s | 如实标注的边界 |
| 64–68s | 结尾：仓库地址 |

## 注意

- 依赖**系统 Chrome/Edge**（`channel`），不需要额外下载 Playwright 自带 Chromium。
- 帧通过管道直送 ffmpeg，磁盘上不留中间帧。
- 改文案或数据后重跑即可全部重生成；`frame.html` 内的数据与仓库内评测结果保持一致。
