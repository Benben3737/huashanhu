(function () {
  const root = document.querySelector("[data-search-page]");
  if (!root || !window.HuashanhuStore) return;
  const store = window.HuashanhuStore;
  const h = store.h;
  const results = root.querySelector("[data-search-results]");
  const summary = root.querySelector("[data-search-summary]");
  const ORDER = ["课程", "章节", "示例心得", "示例作品", "本机草稿", "学习笔记", "课程评价"];

  function snippet(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > 72 ? clean.slice(0, 72) + "…" : clean;
  }

  function localItems() {
    const items = [];
    const drafts = store.load("drafts", []);
    const notes = store.load("study-notes", []);
    if (drafts.ok && Array.isArray(drafts.value)) {
      drafts.value.forEach((draft) => {
        if (!draft || typeof draft.title !== "string") return;
        const body = [draft.summary, draft.materials].concat((draft.chapters || []).map((chapter) => (chapter.heading || "") + " " + (chapter.body || ""))).join(" ");
        items.push({
          type: "本机草稿",
          title: draft.title || "未命名草稿",
          href: "community.html#draft-" + encodeURIComponent(draft.id || ""),
          summary: snippet(draft.summary || body || "这台设备上的草稿"),
          text: draft.title + " " + body,
        });
      });
    }
    if (notes.ok && Array.isArray(notes.value)) {
      notes.value.forEach((note) => {
        if (!note || typeof note !== "object") return;
        items.push({
          type: "学习笔记",
          title: note.course || "未填写课程",
          href: "notes.html#note-" + encodeURIComponent(note.id || ""),
          summary: snippet((note.sharer ? "学了 " + note.sharer + "。" : "") + (note.reflection || note.progress || "本机私有笔记")),
          text: [note.course, note.sharer, note.domain, note.progress, note.reflection, note.feeling].join(" "),
        });
        if (note.shareFeeling && note.feeling) {
          items.push({
            type: "课程评价",
            title: note.course || "未填写课程",
            href: "notes.html#review-" + encodeURIComponent(note.id || ""),
            summary: snippet(note.feeling),
            text: [note.course, note.sharer, note.feeling].join(" "),
          });
        }
      });
    }
    return items;
  }

  function render(query) {
    results.replaceChildren();
    if (!query) {
      summary.textContent = "输入关键词后再搜索。空着不会把全部内容当成结果。";
      return;
    }
    const needle = query.toLowerCase();
    const found = (window.HUASHANHU_PAGES || []).concat(localItems()).filter((item) => {
      return (item.title + " " + item.text + " " + item.summary).toLowerCase().includes(needle);
    });
    if (!found.length) {
      summary.textContent = "没有找到与「" + query + "」匹配的内容。";
      return;
    }
    summary.textContent = "找到 " + found.length + " 条。示例和你的本机记录是分开的类型。";
    ORDER.forEach((type) => {
      const group = found.filter((item) => item.type === type);
      if (!group.length) return;
      const list = h("ul", { class: "draft-list" });
      group.forEach((item) => {
        const link = h("a", { href: item.href, text: item.title });
        list.append(
          h(
            "li",
            { class: "draft-card" },
            h("p", { class: "badge", text: item.type }),
            h("h3", {}, link),
            h("p", { text: item.summary }),
          ),
        );
      });
      results.append(h("section", {}, h("h2", { text: type }), list));
    });
  }

  function run() {
    const query = new URLSearchParams(location.search).get("q") || "";
    const input = document.querySelector("#site-search");
    if (input && document.activeElement !== input) input.value = query;
    render(query.trim());
  }

  document.addEventListener("huashanhu-search", run);
  window.addEventListener("popstate", run);
  run();
})();
