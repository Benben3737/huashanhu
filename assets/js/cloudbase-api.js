(function (global) {
  function base() {
    const value = global.HUASHANHU_CLOUDBASE && global.HUASHANHU_CLOUDBASE.functionBase;
    return typeof value === "string" ? value.trim() : "";
  }

  async function call(action, payload, withAuth) {
    const url = base();
    if (!url) {
      return { ok: false, code: "not_configured", message: "CloudBase 云函数地址还没填写。这次没有写入，也没有读取服务器上的课程。" };
    }
    const headers = { "Content-Type": "application/json" };
    if (withAuth) {
      const session = global.HuashanhuAuth && global.HuashanhuAuth.session();
      if (!session || !session.idToken) {
        return { ok: false, code: "login_required", message: "请先完成邀请登录。未登录不会写入 CloudBase。" };
      }
      headers.Authorization = "Bearer " + session.idToken;
    }
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(Object.assign({ action: action }, payload || {})),
      });
    } catch (error) {
      return { ok: false, code: "unreachable", message: "没有连上 CloudBase。没有写入。" };
    }
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) {
      return { ok: false, code: data.code || "http", message: data.message || "CloudBase 没有完成这次请求。" };
    }
    return { ok: true, data: data };
  }

  global.HuashanhuCloud = {
    configured: function () { return Boolean(base()); },
    listCourses: function () { return call("listCourses", {}, false); },
    getCourse: function (id) { return call("getCourse", { id: id }, true); },
    publishCourse: function (course) { return call("publishCourse", { course: course }, true); },
    listPoints: function () { return call("listPoints", {}, true); },
  };
})(window);
