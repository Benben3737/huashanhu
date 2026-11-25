# 注册验证还缺什么

本仓库和环境里没有已授权的登录项目、SMTP 或邮件 API。`assets/js/auth-config.js` 的三项都是空的。空配置时页面不访问网络，也不显示已发送或已登录。

## 选定的一条路径

用 Firebase Authentication 的邮箱密码注册，加上它自己发出的地址验证邮件。Spark 免费计划的官方限额是每天最多 1000 封地址验证邮件。邮件链接登录每天只有 5 封，所以不用那条。Spark 不需要先绑卡。默认发信不要求自备 SMTP，因此能寄到项目团队以外的新邮箱。

不要用 Supabase 自带 SMTP 做公开注册。官方写明它只发给项目组织里的成员，并且大约每小时 2 封。

没有选 Resend 作为这一步，是因为未验证自有域名之前，它只允许寄到账号自己的邮箱。公开注册还要先有域名和 DNS，比现在多一步。

## 中国大陆

Firebase 的注册和验证走 `identitytoolkit.googleapis.com`，邮件里的默认链接在 `firebaseapp.com`。官方文档没有承诺这些地址在中国大陆可以直接打开。不能把这条路径说成大陆用户无需特殊网络就能收信、点链接、完成注册。

## 一次性要做的事

1. 用自己的 Google 账号在 Firebase 控制台新建一个项目，保持 Spark，不要升级到要绑卡的 Blaze。
2. 打开 Authentication，启用 Email/Password。不要关闭邮箱验证。
3. 把 Web 应用的 `apiKey`、`authDomain`、`projectId` 填进 `assets/js/auth-config.js`。这三项是公开客户端配置，不是服务账号密钥。
4. 把验证邮件的操作网址设为 `https://benben3737.github.io/huashanhu/auth-callback.html`。在这一页合并并发布之前，邮件链接还不能回到线上站点。
5. 不要把服务账号 JSON、SMTP 密码写进仓库。

完成后，用一个真实新邮箱走一遍：注册、收信、打开链接、再登录。只有身份服务返回已验证，页面才显示本次登录。积分和课程发布仍然不会因此接通。

本机草稿继续只存在这台浏览器，注册成功也不会上传它们。
