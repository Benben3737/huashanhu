(function () {
  const root = document.querySelector("[data-print-root]");
  if (!root) return;
  const store = window.HuashanhuStore;
  const h = store.h;
  const status = document.querySelector("[data-print-status]");
  const params = new URLSearchParams(location.search);
  const kind = params.get("kind") === "note" ? "note" : params.get("kind") === "draft" ? "draft" : "";
  const ids = (params.get("id") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const button = document.querySelector("[data-print-button]");
  button?.addEventListener("click", () => window.print());

  function domainLabel(value) {
    return { music: "音乐", fitness: "运动健身", travel: "旅游", cooking: "烹饪", other: "其他" }[value] || "其他";
  }

  function missing(text) {
    root.replaceChildren(h("p", { text }));
    if (button) button.disabled = true;
  }

  if (!kind || !ids.length) {
    missing("请从社区课程作品或学习笔记里选择一份内容，再打开整理页。这里不会导出这台设备上的其他草稿。");
    return;
  }

  const key = kind === "note" ? "study-notes" : "drafts";
  const loaded = store.load(key, []);
  if (!loaded.ok || !Array.isArray(loaded.value)) {
    missing(store.storageMessage({ ok: false, reason: "corrupt" }));
    return;
  }
  const chosen = ids.map((id) => loaded.value.find((item) => item && item.id === id)).filter(Boolean);
  if (!chosen.length) {
    missing("没有找到所选内容。其他本机草稿不会被列出来。");
    return;
  }

  root.replaceChildren();
  chosen.forEach((item) => {
    const sheet = h("article", { class: "print-sheet" });
    if (kind === "draft") {
      sheet.append(
        h("p", { class: "badge", text: "本机草稿整理 · 非公开" }),
        h("h1", { text: item.title || "未命名草稿" }),
        h("p", { text: domainLabel(item.domain) + " · " + (item.template || "") }),
        h("p", { class: "pre", text: item.summary || "" }),
      );
      if (item.materials) sheet.append(h("h2", { text: "开始前准备" }), h("p", { class: "pre", text: item.materials }));
      (item.chapters || []).forEach((chapter, index) => {
        sheet.append(
          h(
            "section",
            { class: "print-chapter" },
            h("h2", { text: index + 1 + ". " + (chapter.heading || "未命名小节") }),
            h("p", { class: "pre", text: chapter.body || "" }),
          ),
        );
      });
    } else {
      sheet.append(
        h("p", { class: "badge", text: "本机学习笔记 · 非公开" }),
        h("h1", { text: item.course || "未填写课程" }),
        h("p", { text: "分享者：" + (item.sharer || "未填写") + " · 领域：" + domainLabel(item.domain) }),
        h("h2", { text: "学习进度" }),
        h("p", { class: "pre", text: item.progress || "未填写" }),
        h("h2", { text: "学习感悟" }),
        h("p", { class: "pre", text: item.reflection || "未填写" }),
        h("h2", { text: "对课程的感受" }),
        h("p", { class: "pre", text: item.feeling || "未填写" }),
        h("p", { text: item.shareFeeling ? "这份导出包含你已同意纳入评价预览的感受。导出本身仍然不是公开发布。" : "这份感受尚未同意纳入评价预览。" }),
      );
    }
    root.append(sheet);
  });
  if (status) status.textContent = "只准备了所选的 " + chosen.length + " 份内容。使用浏览器的打印对话框，可以把它另存为 PDF。";
})();
