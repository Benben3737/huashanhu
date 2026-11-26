/* Authing 公开配置。不要在这里填写 App Secret、用户密码或管理密钥。 */
window.HUASHANHU_AUTH = {
  provider: "authing",
  userPoolId: "6b07db1dfcd143125f5c78b7",
  clientId: "6b07db1fdfcdc5f6f550ee56",
  host: "https://ejfpg9ktqybn-demo.authing.cn",
  issuer: "https://ejfpg9ktqybn-demo.authing.cn/oidc",
  authorizationEndpoint: "https://ejfpg9ktqybn-demo.authing.cn/oidc/auth",
  tokenEndpoint: "https://ejfpg9ktqybn-demo.authing.cn/oidc/token",
  jwksUri: "https://ejfpg9ktqybn-demo.authing.cn/oidc/.well-known/jwks.json",
  endSessionEndpoint: "https://ejfpg9ktqybn-demo.authing.cn/oidc/session/end",
  redirectUri: "https://benben3737.github.io/huashanhu/auth-callback.html",
  postLogoutRedirectUri: "https://benben3737.github.io/huashanhu/",
};
