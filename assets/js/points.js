(function () {
  document.querySelectorAll("[data-points-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.getAttribute("data-points-action");
      const status = document.querySelector("[data-points-status]");
      const result = action === "redeem" ? await window.HuashanhuApi.redeem() : await window.HuashanhuApi.requestOffline();
      if (!status) return;
      status.textContent = result.ok
        ? "出现了意外的成功返回。本页不会把它当成订单或预约已经提交。"
        : "当前不提交任何真实订单或消息。兑换比例、库存和线下预约流程都还待确定。";
    });
  });

  const slot = document.querySelector("[data-server-points]");
  if (!slot || !window.HuashanhuCloud) return;
  if (!window.HuashanhuAuth.session()) {
    slot.textContent = "未登录";
    return;
  }
  if (!window.HuashanhuCloud.configured()) {
    slot.textContent = "云函数未配置";
    return;
  }
  window.HuashanhuCloud.listPoints().then((result) => {
    slot.textContent = result.ok ? String(result.data.total) : "没有读到";
  }).catch(() => {
    slot.textContent = "没有连上";
  });
})();
