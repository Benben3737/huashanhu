(function () {
  const store = window.HuashanhuStore;
  const h = store.h;
  const $ = (sel, root = document) => root.querySelector(sel);

  const menuBtn = $(".menu-btn");
  const nav = $("#site-nav");
  const menuLabel = $("[data-menu-label]");

  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    if (menuLabel) menuLabel.textContent = open ? "关闭" : "菜单";
  }

  menuBtn?.addEventListener("click", () => {
    const open = menuBtn.getAttribute("aria-expanded") !== "true";
    setMenu(open);
    if (open) nav.querySelector("a")?.focus();
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) {
      setMenu(false);
      menuBtn?.focus();
    }
  });

  function confirmAction(message, confirmLabel) {
    return new Promise((resolve) => {
      const dialog = h(
        "div",
        { class: "modal", role: "presentation" },
        h(
          "div",
          { class: "modal-dialog", role: "dialog", tabindex: "-1", "aria-modal": "true" },
          h("h2", { text: "请确认" }),
          h("p", { text: message }),
          h(
            "div",
            { class: "actions" },
            h("button", { class: "ghost-btn", type: "button", text: "取消" }),
            h("button", { class: "primary-btn", type: "button", text: confirmLabel || "确认" }),
          ),
        ),
      );
      const panel = dialog.querySelector(".modal-dialog");
      const [cancelBtn, confirmBtn] = dialog.querySelectorAll("button");
      let settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        dialog.remove();
        resolve(value);
      }
      cancelBtn.addEventListener("click", () => finish(false));
      confirmBtn.addEventListener("click", () => finish(true));
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) finish(false);
      });
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
          return;
        }
        if (event.key !== "Tab") return;
        const items = [cancelBtn, confirmBtn];
        const first = items[0];
        const last = items[1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
      document.body.append(dialog);
      panel.focus();
    });
  }

  document.querySelectorAll("[data-clear-local]").forEach((button) => {
    button.addEventListener("click", async () => {
      const ok = await confirmAction(
        "清除这台设备上的化山湖本机草稿、学习笔记和评价预览同意？此操作只影响当前浏览器，不能撤销。",
        "确认清除",
      );
      if (!ok) return;
      const result = store.clearLocal();
      const status = document.querySelector("[data-clear-status]");
      if (!result.ok) {
        if (status) status.textContent = store.storageMessage(result);
        return;
      }
      window.location.reload();
    });
  });

  function enhanceSlots() {
    const tables = window.SITE_LINKS || {};
    document.querySelectorAll("[data-slot]").forEach((slot) => {
      const kind = slot.getAttribute("data-slot") || "";
      const id = slot.getAttribute("data-slot-id") || "";
      const raw = tables[kind] && typeof tables[kind][id] === "string" ? tables[kind][id].trim() : "";
      const anchor = slot.querySelector(".slot-link");
      const status = slot.querySelector(".slot-status");
      let href = "";
      try {
        const url = new URL(raw);
        if (url.protocol === "http:" || url.protocol === "https:") href = url.href;
      } catch (error) {
        href = "";
      }
      if (!anchor || !status) return;
      if (!href) {
        anchor.hidden = true;
        anchor.removeAttribute("href");
        status.textContent = "链接尚未配置";
        return;
      }
      anchor.href = href;
      anchor.hidden = false;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = "打开已配置的外部链接";
      status.textContent = "已填写外部链接";
    });
  }

  enhanceSlots();
  window.HuashanhuConfirm = confirmAction;

  const siteSearch = document.querySelector("#site-search");
  if (siteSearch) {
    const here = location.pathname.endsWith("search.html");
    if (here) {
      const current = new URLSearchParams(location.search).get("q") || "";
      if (current) siteSearch.value = current;
    }
    let timer = 0;
    siteSearch.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const q = siteSearch.value.trim();
        const url = "search.html" + (q ? "?q=" + encodeURIComponent(q) : "");
        if (location.pathname.endsWith("search.html")) {
          history.replaceState({}, "", url);
          document.dispatchEvent(new Event("huashanhu-search"));
        } else if (q) {
          location.href = url;
        }
      }, 180);
    });
  }
})();
