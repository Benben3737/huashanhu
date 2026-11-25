(function (global) {
  /* 静态页面的适配层。当前没有可用的后台地址，所有方法都在浏览器内返回未接通，不发起网络请求。 */
  const NOT_CONNECTED = {
    ok: false,
    code: "not_connected",
    message: "后台尚未接通。没有发送请求，也没有改变服务器上的任何数据。",
  };

  function refuse() {
    return Promise.resolve(Object.assign({}, NOT_CONNECTED));
  }

  global.HuashanhuApi = {
    publishCourse: refuse,
    requestInvite: refuse,
    verifyInvite: refuse,
    awardPoints: refuse,
    redeem: refuse,
    requestOffline: refuse,
    withdrawConsent: refuse,
  };
})(window);
