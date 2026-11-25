(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

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

  const VIEW_KEY = "skill-space-student-view";
  const banner = $("#student-banner");
  const modal = $("#demo-modal");
  let lastFocus = null;

  function viewOn() {
    return document.body.classList.contains("is-student");
  }

  function applyView(on) {
    document.body.classList.toggle("is-student", on);
    if (banner) banner.hidden = !on;
    $$("[data-student-label]").forEach((el) => {
      el.textContent = on ? "退出学生视图" : "体验学生视图";
    });
  }

  function setView(on) {
    try {
      if (on) sessionStorage.setItem(VIEW_KEY, "1");
      else sessionStorage.removeItem(VIEW_KEY);
    } catch (error) {
      /* 无存储时只保留当前页的界面状态。 */
    }
    applyView(on);
  }

  try {
    applyView(sessionStorage.getItem(VIEW_KEY) === "1");
  } catch (error) {
    applyView(false);
  }

  function inertRoots() {
    return $$("[data-inert-root]");
  }

  function openModal() {
    if (!modal) return;
    setMenu(false);
    lastFocus = document.activeElement;
    inertRoots().forEach((el) => {
      el.inert = true;
    });
    modal.hidden = false;
    document.body.classList.add("modal-open");
    $(".modal-dialog", modal)?.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    inertRoots().forEach((el) => {
      el.inert = false;
    });
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  $$("[data-open-demo]").forEach((btn) => btn.addEventListener("click", openModal));
  $$("[data-close-demo]").forEach((btn) => btn.addEventListener("click", closeModal));
  $$("[data-student-enter]").forEach((btn) =>
    btn.addEventListener("click", () => {
      setView(true);
      closeModal();
    }),
  );
  $$("[data-student-exit]").forEach((btn) =>
    btn.addEventListener("click", () => setView(false)),
  );
  $$("[data-student-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (viewOn()) setView(false);
      else openModal();
    }),
  );

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  modal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = $(".modal-dialog", modal);
    const items = $$(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      dialog,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const root = $("[data-hierarchy]");
  if (root) bindHierarchy(root);
  enhanceSlots();

  function bindHierarchy(scope) {
    const form = $("[data-filter-form]", scope);
    const qInput = $("[data-q]", scope);
    const subRow = $("[data-sub-row]", scope);
    const empty = $("[data-empty]", scope);
    const count = $("[data-count]", scope);
    const known = new Set($$("[data-domain-block]", scope).map((el) => el.dataset.domain));

    function read() {
      const params = new URLSearchParams(location.search);
      return {
        domain: params.get("domain") || "",
        sub: params.get("sub") || "",
        q: params.get("q") || "",
      };
    }

    function write(next, mode) {
      const current = read();
      if (current.domain === next.domain && current.sub === next.sub && current.q === next.q) {
        apply(false);
        return;
      }
      const params = new URLSearchParams();
      if (next.domain) params.set("domain", next.domain);
      if (next.sub) params.set("sub", next.sub);
      if (next.q) params.set("q", next.q);
      const qs = params.toString();
      const url = location.pathname + (qs ? "?" + qs : "") + location.hash;
      const state = { hierarchy: 1 };
      if (mode === "push") history.pushState(state, "", url);
      else history.replaceState(state, "", url);
      apply(false);
    }

    function apply(fromHistory) {
      const state = read();
      const query = state.q.trim().toLowerCase();
      if (qInput && (fromHistory || document.activeElement !== qInput)) qInput.value = state.q;

      $$("[data-set-domain]", scope).forEach((btn) => {
        btn.setAttribute("aria-pressed", String((btn.dataset.setDomain || "") === state.domain));
      });

      const showSubs = Boolean(state.domain) && known.has(state.domain);
      if (subRow) subRow.hidden = !showSubs;
      $$("[data-set-sub]", scope).forEach((btn) => {
        const sameDomain = btn.dataset.domain === state.domain;
        btn.hidden = !sameDomain;
        btn.setAttribute("aria-pressed", String(sameDomain && btn.dataset.setSub === state.sub));
      });

      let visible = 0;
      $$("[data-entry]", scope).forEach((entry) => {
        const hay = (entry.dataset.search || "").toLowerCase();
        const show =
          (!state.domain || entry.dataset.domain === state.domain) &&
          (!state.sub || entry.dataset.sub === state.sub) &&
          (!query || hay.includes(query));
        entry.hidden = !show;
        if (show) visible += 1;
      });
      $$("[data-group]", scope).forEach((group) => {
        group.hidden = !$$("[data-entry]", group).some((entry) => !entry.hidden);
      });
      $$("[data-domain-block]", scope).forEach((block) => {
        block.hidden = !$$("[data-group]", block).some((group) => !group.hidden);
      });

      const unknown = Boolean(state.domain) && !known.has(state.domain);
      if (empty) {
        empty.hidden = !unknown && visible > 0;
        empty.textContent = unknown
          ? "这个链接里的领域不存在。请从上面的领域重新选择。"
          : "没有匹配的示例课程。换一个领域，或清空搜索。";
      }
      if (count) {
        count.textContent = unknown
          ? "当前链接无法对应到示例领域"
          : visible
            ? "当前显示 " + visible + " 门示例课程，仍按领域和子技能分组"
            : "当前没有可显示的示例课程";
      }
    }

    $$("[data-set-domain]", scope).forEach((btn) => {
      btn.addEventListener("click", () => {
        write({ domain: btn.dataset.setDomain || "", sub: "", q: read().q }, "push");
      });
    });
    $$("[data-set-sub]", scope).forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = read();
        const sub = current.sub === btn.dataset.setSub ? "" : btn.dataset.setSub;
        write({ domain: btn.dataset.domain || "", sub, q: current.q }, "push");
      });
    });
    qInput?.addEventListener("input", () => {
      const current = read();
      const nextQ = qInput.value;
      write({ domain: current.domain, sub: current.sub, q: nextQ }, current.q ? "replace" : "push");
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
    });
    window.addEventListener("popstate", () => apply(true));
    apply(true);
  }

  function enhanceSlots() {
    const tables = window.SITE_LINKS || {};
    $$("[data-slot]").forEach((slot) => {
      const kind = slot.getAttribute("data-slot") || "";
      const id = slot.getAttribute("data-slot-id") || "";
      const raw = tables[kind] && typeof tables[kind][id] === "string" ? tables[kind][id].trim() : "";
      const anchor = $(".slot-link", slot);
      const status = $(".slot-status", slot);
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
})();
