# CloudBase 与 Authing 还要在控制台做的事

本仓库没有、也不应提交 Authing App Secret、CloudBase 自定义登录私钥或数据库密码。云函数部署和预览站点发布由控制台完成，不在这次改动里执行。

## 站点会用到的地址

CloudBase 预览站在域名根目录，GitHub Pages 在 `/huashanhu/`。两边都要允许回调。

Authing 登录回调：

- `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com/auth-callback.html`
- `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com/`
- `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com/index.html`
- `https://benben3737.github.io/huashanhu/auth-callback.html`
- `https://benben3737.github.io/huashanhu/`
- `https://benben3737.github.io/huashanhu/index.html`

Authing 退出回调：

- `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com/`
- `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com/index.html`
- `https://benben3737.github.io/huashanhu/`
- `https://benben3737.github.io/huashanhu/index.html`

Authing CORS：

- `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com`
- `https://benben3737.github.io`

登录发起页可以是上述两个首页。保持「禁止注册」。受邀邮箱只在 Authing 用户管理里添加。

## CloudBase

环境 ID：`huashanhu-d8gc6g7x681612ecd`，地域 `ap-shanghai`。

1. 身份认证 → 登录方式 → 启用「自定义登录」，下载私钥。不要把私钥文件提交到 GitHub。
2. 部署 `cloudfunctions/huashanhu-api`。在云函数环境变量里设置：
   - `TCB_ENV`
   - `AUTH_ISSUER`
   - `AUTH_CLIENT_ID`
   - `CUSTOM_LOGIN_CREDENTIALS`（私钥 JSON 的整段文本）
3. HTTP 网关新建路由，关联该云函数，路径建议 `/huashanhu-api`，允许 `POST` 和 `OPTIONS`。
4. 把控制台显示的完整 HTTPS 地址填进 `assets/js/cloudbase-config.js` 的 `functionBase`。留空时页面会说明还没接通，不会假装写入成功。
5. 文档数据库建立三个集合：`course_catalog`、`course_bodies`、`points_ledger`。建议都设为「无权限」，只让这个云函数用管理身份读写。目录接口只返回标题、简介、领域、类型和显示名，不返回邮箱和章节正文。

## 怎样在预览站核对

部署并填好 `functionBase` 之后，打开 `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com/community.html`。未登录可以看见目录和「提交到社区」说明。用已在 Authing 创建的邮箱完成邀请登录，再提交一门课程。返回编号后，未登录点击该课程应看到「需要邀请」，登录后才看到正文。只有类型选「课程」时账本加 1 分。
