(function (global) {
  const cfg = global.HUASHANHU_AUTH || {};
  const PKCE_KEY = "huashanhu.authing.pkce";
  const SESSION_KEY = "huashanhu.authing.session";

  function base64url(bytes) {
    let text = "";
    bytes.forEach((value) => {
      text += String.fromCharCode(value);
    });
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function bytesFromBase64url(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function randomUrl(size) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return base64url(bytes);
  }

  async function codeChallenge(verifier) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return base64url(new Uint8Array(digest));
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || session.iss !== cfg.issuer || session.aud !== cfg.clientId) return null;
      if (!session.exp || session.exp * 1000 <= Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      if (session.email_verified !== true) return null;
      return session;
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  async function prepareLogin() {
    const verifier = randomUrl(32);
    const state = randomUrl(16);
    const nonce = randomUrl(16);
    const challenge = await codeChallenge(verifier);
    sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier: verifier, state: state, nonce: nonce }));
    const url = new URL(cfg.authorizationEndpoint);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", cfg.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  function startLogin() {
    return prepareLogin().then((url) => {
      location.assign(url);
    });
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PKCE_KEY);
    const url = new URL(cfg.endSessionEndpoint);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("post_logout_redirect_uri", cfg.postLogoutRedirectUri);
    location.assign(url.toString());
  }

  async function signingKey(kid) {
    const response = await fetch(cfg.jwksUri);
    if (!response.ok) throw new Error("jwks");
    const body = await response.json();
    const jwk = (body.keys || []).find((key) => key.kid === kid && key.kty === "RSA");
    if (!jwk) throw new Error("kid");
    return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  }

  async function verifyIdToken(idToken, nonce) {
    const parts = String(idToken || "").split(".");
    if (parts.length !== 3) throw new Error("shape");
    const header = JSON.parse(new TextDecoder().decode(bytesFromBase64url(parts[0])));
    if (header.alg !== "RS256" || !header.kid) throw new Error("alg");
    const key = await signingKey(header.kid);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      bytesFromBase64url(parts[2]),
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    );
    if (!valid) throw new Error("signature");
    const payload = JSON.parse(new TextDecoder().decode(bytesFromBase64url(parts[1])));
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (payload.iss !== cfg.issuer || !audience.includes(cfg.clientId)) throw new Error("claim");
    if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error("exp");
    if (!nonce || payload.nonce !== nonce) throw new Error("nonce");
    return payload;
  }

  async function completeLogin(search) {
    const params = new URLSearchParams(search);
    const returnedError = params.get("error");
    const code = params.get("code");
    const state = params.get("state");
    history.replaceState({}, "", location.pathname);
    if (returnedError) {
      return { ok: false, message: "Authing 没有完成登录。没有建立会话。" };
    }
    if (!code || !state) {
      return { ok: false, message: "回调里没有可交换的授权码。没有建立会话。" };
    }
    let pending;
    try {
      pending = JSON.parse(sessionStorage.getItem(PKCE_KEY) || "null");
    } catch (error) {
      pending = null;
    }
    sessionStorage.removeItem(PKCE_KEY);
    if (!pending || pending.state !== state || !pending.verifier || !pending.nonce) {
      return { ok: false, message: "这次回调和发出登录的页面不匹配。没有建立会话。" };
    }
    let response;
    try {
      response = await fetch(cfg.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: cfg.redirectUri,
          client_id: cfg.clientId,
          code_verifier: pending.verifier,
        }),
      });
    } catch (error) {
      return { ok: false, message: "没有连上 Authing。没有登录，也没有建立会话。" };
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id_token) {
      return { ok: false, message: "Authing 没有发回可核验的身份令牌。没有建立会话。" };
    }
    let payload;
    try {
      payload = await verifyIdToken(data.id_token, pending.nonce);
    } catch (error) {
      return { ok: false, message: "身份令牌没有通过校验。没有建立会话。" };
    }
    if (payload.email_verified !== true) {
      return { ok: false, message: "Authing 还没有把这个邮箱标成已验证。本站不把这次访问当作已登录。" };
    }
    const session = {
      iss: payload.iss,
      aud: cfg.clientId,
      sub: payload.sub,
      email: payload.email || "",
      email_verified: true,
      exp: payload.exp,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return {
      ok: true,
      message: "Authing 已确认这个邮箱。本次浏览器标签可以视为已登录。积分账本和课程公开发布没有接通，本机草稿也没有上传。",
    };
  }

  global.HuashanhuAuth = {
    prepareLogin: prepareLogin,
    startLogin: startLogin,
    logout: logout,
    completeLogin: completeLogin,
    session: readSession,
  };
})(window);
