(function () {
  const root = document.querySelector("[data-invite]");
  if (!root || !window.HuashanhuAuth) return;
  const status = document.querySelector("[data-invite-status]");
  const session = document.querySelector("[data-session]");
  const missing = document.querySelector("[data-auth-missing]");

  function clearSecrets(form) {
    Array.from(form.elements).forEach(function (field) {
      if (field.type === "password" || field.type === "email") field.value = "";
    });
  }

  function showSession() {
    const current = window.HuashanhuAuth.session();
    if (!session) return;
    session.textContent = current && current.emailVerified
      ? "本次页面会话：" + current.email + "。旧草稿仍只在这台浏览器，没有绑定到账号。"
      : "";
  }

  if (missing) {
    missing.textContent = window.HuashanhuAuth.configured()
      ? "身份服务配置已填写。是否真的发出邮件，以对方接口的返回为准。"
      : "还缺一个 Firebase 项目的公开配置：apiKey、authDomain、projectId。填上之前，这个页面不会访问身份服务。";
  }

  async function submit(form, action) {
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    clearSecrets(form);
    let result;
    try {
      result = await action(email, password);
    } catch (error) {
      status.textContent = "没有连上身份服务。没有建立登录。";
      return;
    }
    status.textContent = result.message;
    showSession();
  }

  const registerForm = root.querySelector("[data-register-form]");
  const signInForm = root.querySelector("[data-signin-form]");
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();
    submit(registerForm, window.HuashanhuAuth.register);
  });
  signInForm.addEventListener("submit", function (event) {
    event.preventDefault();
    submit(signInForm, window.HuashanhuAuth.signIn);
  });
})();
