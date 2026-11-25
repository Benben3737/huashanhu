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
})();
