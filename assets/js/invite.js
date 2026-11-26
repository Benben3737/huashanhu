(function () {
  const root = document.querySelector("[data-account]");
  if (!root || !window.HuashanhuAuth) return;
  const status = document.querySelector("[data-account-status]");
  const sessionLine = document.querySelector("[data-account-session]");

  function showSession() {
    const session = window.HuashanhuAuth.session();
    if (!sessionLine) return;
    sessionLine.textContent = session
      ? "本次标签已登录：" + (session.email || session.sub) + "。本机草稿没有绑定到这个账号。"
      : "当前没有已验证的登录。";
  }

  root.querySelector("[data-start-login]").addEventListener("click", () => {
    status.textContent = "正在转到 Authing。密码只在 Authing 页面输入。";
    window.HuashanhuAuth.startLogin().catch(() => {
      status.textContent = "没有连上 Authing。没有登录，也没有建立会话。";
    });
  });

  const logout = root.querySelector("[data-logout]");
  if (logout) {
    logout.addEventListener("click", () => {
      window.HuashanhuAuth.logout();
    });
  }
  showSession();
})();
