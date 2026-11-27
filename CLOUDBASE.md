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
   - `FOUNDER_USER_IDS`（逗号分隔的 Authing 用户 ID，不是邮箱）。云函数优先读这个变量。令牌里的 `external_id` 或 `externalId` 等于 `founder` 时也视为创始人。创始人发布时，没有昵称就显示「化山湖创始人」。
3. HTTP 网关新建路由，关联该云函数，路径建议 `/huashanhu-api`，允许 `POST` 和 `OPTIONS`。
4. 公开的云函数地址已经写在 `assets/js/cloudbase-config.js` 的 `functionBase`：`https://huashanhu-d8gc6g7x681612ecd-1542175561.ap-shanghai.app.tcloudbase.com/huashanhu-api`。这是 HTTPS 入口，不是密钥。如果网关地址以后变了，只改这一处。
5. 文档数据库建立集合：`course_catalog`、`course_bodies`、`points_ledger`、`site_copy`。都设为「无权限」，只让这个云函数用管理身份读写。目录接口只返回标题、简介、项目、子项目、类型和显示名，不返回邮箱和章节正文。发布时项目和子项目必须对得上 `taxonomy.js` 里的目录；没有子项目的项目不能带子项目，有子项目的必须带上其中一个。`site_copy` 只存网站文案覆盖，每条是稳定的 `key` 和纯文本，不存 HTML。
6. 云函数动作：`listCourses`、`getCourse`、`publishCourse`、`authTicket`、`listPoints`、`listCopy`、`saveCopy`、`whoami`。`listCopy` 不需要登录，访客也能读到已保存的文案。`saveCopy` 只接受创始人；其他登录用户和访客调用都会被拒绝。`whoami` 给已登录用户返回 `role` 和 `permissions`，不返回邮箱。创始人仍由 `FOUNDER_USER_IDS` 和令牌里的 `external_id` / `externalId` = `founder` 判断，没有新的密钥。

## 怎样在预览站核对

打开 `https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com/community.html`。未登录可以看见目录和「提交到社区」说明。用已在 Authing 创建的账号完成邀请登录后再提交。免费版管理员创建的账号可以没有 `email_verified`，只要令牌签名、签发方、受众和有效期通过，这次登录仍然成立。返回编号后，未登录点击该课程应看到「需要邀请」，登录后才看到正文。只有类型选「课程」时账本加 1 分。`getCourse`、`publishCourse`、`authTicket` 和 `listPoints` 会返回 `role` 与 `permissions`。
