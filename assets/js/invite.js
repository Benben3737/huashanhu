(function () {
  const root = document.querySelector("[data-invite]");
  if (!root) return;
  const status = document.querySelector("[data-invite-status]");

  async function refuse(form) {
    const result = await window.HuashanhuApi.verifyInvite();
    Array.from(form.elements).forEach((field) => {
      if ("value" in field && field.type !== "submit" && field.type !== "button") field.value = "";
    });
    status.textContent = result.ok
      ? "出现了意外的成功返回。本页不会把它显示成已登录。"
      : "邀请验证服务尚未接通。邮箱、验证码和邀请链接没有发送，也没有保存，没有建立登录。";
  }

  root.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      refuse(form);
    });
  });
})();
