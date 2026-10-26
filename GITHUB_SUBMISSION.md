# 用这个仓库完成 Lexmount 比赛投稿（操作步骤）

> 本文件给「把项目发布到 GitHub 公开仓库 → 在比赛网站投稿」的完整操作路径。
> 涉及账号的操作（建仓库、push、登录投稿）由你本人完成。

## 一、发布到 GitHub（你本人操作）

### 方式 A：GitHub 网页直接上传（最简单，无需命令行）

1. 打开 https://github.com/new ，创建**公开（Public）**仓库，名字如 `applycheck`。
2. 创建后进入仓库，点 **「uploading an existing file」**（或 Add file → Upload files）。
3. 把本目录（`applycheck-gh-repo`）里的**全部文件和文件夹**拖进去（或先压缩再拖 zip）。
   - ⚠️ 上传前确认这些**不要**出现在仓库里：`.env`、`node_modules/`、`output/`（本工作树已保证没有）。
4. 填写 commit message（如 `Add ApplyCheck project`），点 **Commit**。
5. 记下仓库地址：`https://github.com/<你的用户名>/applycheck`，这就是「材料链接」。

### 方式 B：命令行（可选，适合会 Git 的人）

```powershell
cd D:\无用\Lexmount\ApplyCheck_v0.1_20261019\applycheck-gh-repo
git init
git add .
git commit -m "Add ApplyCheck: Lexmount 投前核验项目"
git branch -M main
git remote add origin https://github.com/<你的用户名>/applycheck.git
git push -u origin main
```

> 首次 push 会要求 GitHub 登录授权（浏览器或 PAT token），由你完成。

## 二、投稿（你本人操作）

1. 浏览器打开 https://browser.lexmount.cn/events/real-task-challenge/submit 并登录。
2. 按表单字段填写（对应内容见 `submission/form-material.md`）：
   - **任务** → 「项目简介」+「解决的痛点」
   - **做法** → 「技术方案」段
   - **结果** → 「实际成果」段（20岗、17/3、入口核验、快照、用量，如实附日期）
   - **材料链接** → 上面记下的 GitHub 仓库地址
   - **局限/未完成** → 「局限」段（照实填写）
3. 提交前核对：是否遵守 `submission/OFFICIAL_REQUIREMENTS.md` 里的官方红线。

## 三、投稿前最后自查清单

- [ ] GitHub 仓库为 Public，README 能正常显示
- [ ] 仓库内无 `.env` / 密钥 / `node_modules` / `output`（原始 session）
- [ ] LICENSE 里的作者名已改成真实姓名/团队名
- [ ] 演示视频（如已录制）链接已放材料链接或表单备注
- [ ] 表单字段与实际页面一致（以你登录后看到的为准，本材料不臆造字段）
