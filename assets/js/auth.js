(function (global) {
  const cfg = global.HUASHANHU_AUTH || {};
  let memorySession = null;

  function configured() {
    return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId);
  }

  function endpoint(path) {
    return "https://identitytoolkit.googleapis.com/v1/" + path + "?key=" + encodeURIComponent(cfg.apiKey);
  }

  async function post(path, body) {
    const response = await fetch(endpoint(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(function () { return {}; });
    return { ok: response.ok, data: data };
  }

  function messageFrom(data) {
    const code = data && data.error && data.error.message ? String(data.error.message).split(" : ")[0] : "";
    if (code === "EMAIL_EXISTS") return "这个邮箱已经注册。请改用登录。未验证的账号不会被当作已登录。";
    if (code === "EMAIL_NOT_FOUND" || code === "INVALID_LOGIN_CREDENTIALS" || code === "INVALID_PASSWORD") {
      return "邮箱或密码不正确。没有建立登录。";
    }
    if (code === "WEAK_PASSWORD") return "密码不符合身份服务的要求。没有建立登录。";
    if (code === "INVALID_OOB_CODE" || code === "EXPIRED_OOB_CODE") return "验证链接无效或已过期。没有建立登录。";
    if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") return "身份服务暂时限制了这个请求。没有建立登录。";
    return "身份服务没有完成这次请求。没有建立登录。";
  }

  function missing() {
    return {
      ok: false,
      code: "not_configured",
      message: "注册验证还没接通。仓库里的身份服务配置是空的，也没有已授权的邮件或登录项目。邮箱和密码没有发送，也没有保存。",
    };
  }

  async function register(email, password) {
    if (!configured()) return missing();
    const created = await post("accounts:signUp", { email: email, password: password, returnSecureToken: true });
    if (!created.ok) return { ok: false, code: "rejected", message: messageFrom(created.data) };
    const sent = await post("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken: created.data.idToken });
    memorySession = null;
    if (!sent.ok) {
      return {
        ok: false,
        code: "mail_failed",
        message: "身份服务已记下这个未验证邮箱，但验证邮件没有发出。本站不把未验证账号当作已登录。",
      };
    }
    return {
      ok: true,
      code: "verification_sent",
      message: "身份服务已接受注册并负责发送验证邮件。邮箱尚未验证，所以这里还没有登录。积分和课程发布也没有接通。",
    };
  }

  async function signIn(email, password) {
    if (!configured()) return missing();
    const result = await post("accounts:signInWithPassword", { email: email, password: password, returnSecureToken: true });
    if (!result.ok) return { ok: false, code: "rejected", message: messageFrom(result.data) };
    if (!result.data.emailVerified) {
      await post("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken: result.data.idToken });
      memorySession = null;
      return {
        ok: false,
        code: "unverified",
        message: "邮箱还没有验证。身份服务会处理验证邮件。验证完成前，这里不开放登录，积分和课程发布也不会接通。",
      };
    }
    memorySession = { email: result.data.email, emailVerified: true };
    return {
      ok: true,
      code: "signed_in",
      message: "这个邮箱已由身份服务验证，本次打开的页面可以视为已登录。令牌只留在内存里，刷新后需要重新登录。积分账本和课程公开发布仍然没有接通。",
    };
  }

  async function applyCode(oobCode) {
    if (!configured()) return missing();
    const result = await post("accounts:update", { oobCode: oobCode });
    if (!result.ok || !result.data.emailVerified) return { ok: false, code: "rejected", message: messageFrom(result.data) };
    return {
      ok: true,
      code: "verified",
      message: "身份服务确认了这个邮箱。请回到注册登录页用原密码登录。这一步没有打开发布或积分。",
    };
  }

  global.HuashanhuAuth = {
    configured: configured,
    register: register,
    signIn: signIn,
    applyCode: applyCode,
    session: function () { return memorySession; },
  };
})(window);
