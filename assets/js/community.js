(function () {
  const root = document.querySelector("[data-community]");
  if (!root) return;
  const store = window.HuashanhuStore;
  const h = store.h;
  const TEMPLATES = {
    text: {
      label: "文字型",
      blurb: "适合把认识写成文章：先点明题旨，再展开、举例、收束。",
      summaryLabel: "想说清的一句话",
      materials: false,
      chapters: ["题旨", "展开", "一个例子", "收束"],
    },
    experience: {
      label: "经验型",
      blurb: "适合整理亲身经历：当时的处境、经过、收获，以及想提醒后来人的话。",
      summaryLabel: "当时身处的情况",
      materials: false,
      chapters: ["背景", "经过", "我留下的收获", "想提醒后来的人"],
    },
    technical: {
      label: "技术型",
      blurb: "适合可照着做的技能：先写结果和准备，再写步骤、检查和容易出错的地方。",
      summaryLabel: "做完应看到的结果",
      materials: true,
      chapters: ["操作步骤", "做完如何检查", "容易出错的地方"],
    },
  };
  const DOMAINS = [
    ["", "全部领域"],
    ["music", "音乐"],
    ["fitness", "运动健身"],
    ["travel", "旅游"],
    ["cooking", "烹饪"],
    ["other", "其他"],
  ];
  const KINDS = [
    ["", "全部"],
    ["course", "课程"],
    ["insight", "心得"],
    ["work", "作品"],
  ];

  const form = root.querySelector("[data-draft-form]");
  const templateName = root.querySelector("[data-template-name]");
  const summaryLabel = root.querySelector("[data-summary-label]");
  const materialsField = root.querySelector("[data-materials-field]");
  const chapterHost = root.querySelector("[data-chapters]");
  const preview = root.querySelector("[data-draft-preview]");
  const publishNote = root.querySelector("[data-publish-note]");
  const status = root.querySelector("[data-draft-status]");
  const list = root.querySelector("[data-draft-list]");
  const storageNote = root.querySelector("[data-storage-note]");
  let drafts = [];
  let storageBlocked = false;
  let current = blank("text");

  function blank(template) {
    const spec = TEMPLATES[template];
    return {
      id: "",
      template,
      title: "",
      domain: "other",
      summary: "",
      materials: "",
      chapters: spec.chapters.map((heading) => ({ id: uid(), heading, body: "" })),
      localPreview: false,
      updatedAt: "",
    };
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function say(text) {
    if (status) status.textContent = text;
  }

  function readStore() {
    const result = store.load("drafts", []);
    if (!result.ok || !Array.isArray(result.value)) {
      storageBlocked = true;
      drafts = [];
      if (storageNote) storageNote.textContent = store.storageMessage(result.ok ? { ok: false, reason: "corrupt" } : result);
      return;
    }
    drafts = result.value.filter((item) => item && typeof item.title === "string" && TEMPLATES[item.template]);
  }

  function writeStore() {
    if (storageBlocked) {
      say("本机数据无法读取。请先清除这台设备上的数据，再保存新草稿。这一次没有覆盖原数据。");
      return false;
    }
    const result = store.save("drafts", drafts);
    if (!result.ok) {
      say(store.storageMessage(result));
      return false;
    }
    return true;
  }

  function domainLabel(value) {
    const found = DOMAINS.find((item) => item[0] === value);
    return found ? found[1] : "其他";
  }

  function syncForm() {
    const spec = TEMPLATES[current.template];
    form.elements.title.value = current.title;
    form.elements.domain.value = current.domain || "other";
    form.elements.summary.value = current.summary;
    form.elements.materials.value = current.materials || "";
    templateName.textContent = spec.label;
    summaryLabel.textContent = spec.summaryLabel;
    materialsField.hidden = !spec.materials;
    renderChapterEditors();
  }

  function readForm() {
    current.title = form.elements.title.value.trim();
    current.domain = form.elements.domain.value;
    current.summary = form.elements.summary.value.trim();
    current.materials = TEMPLATES[current.template].materials ? form.elements.materials.value.trim() : "";
  }

  function renderChapterEditors() {
    chapterHost.replaceChildren();
    current.chapters.forEach((chapter, index) => {
      const heading = h("input", { type: "text", value: chapter.heading, "aria-label": "第 " + (index + 1) + " 节标题" });
      const body = h("textarea", { rows: "4", "aria-label": "第 " + (index + 1) + " 节正文" });
      body.value = chapter.body;
      heading.addEventListener("input", () => {
        chapter.heading = heading.value;
      });
      body.addEventListener("input", () => {
        chapter.body = body.value;
      });
      const remove = h("button", { type: "button", class: "text-btn", text: "移除此节" });
      remove.addEventListener("click", () => {
        current.chapters.splice(index, 1);
        renderChapterEditors();
      });
      chapterHost.append(
        h(
          "fieldset",
          { class: "chapter-editor" },
          h("legend", { text: "第 " + (index + 1) + " 节" }),
          h("label", { text: "标题" }, heading),
          h("label", { text: "正文" }, body),
          remove,
        ),
      );
    });
  }

  function renderPreview() {
    readForm();
    const spec = TEMPLATES[current.template];
    preview.hidden = false;
    preview.className = "draft-preview preview-" + current.template;
    preview.replaceChildren(
      h("p", { class: "badge", text: "预览 · 仅本机 · " + spec.label }),
      h("h3", { text: current.title || "未命名草稿" }),
      h("p", { class: "meta", text: domainLabel(current.domain) + " · 还没有公开" }),
      h("p", { text: current.summary || "还没有填写导语。" }),
    );
    if (spec.materials) {
      preview.append(h("h4", { text: "开始前准备" }), h("p", { class: "pre", text: current.materials || "还没有写准备事项。" }));
    }
    current.chapters.forEach((chapter, index) => {
      const block = h("section", { class: "preview-chapter" });
      if (current.template === "technical") {
        block.append(h("p", { class: "num", text: String(index + 1).padStart(2, "0") }));
      }
      block.append(h("h4", { text: chapter.heading || "未命名小节" }), h("p", { class: "pre", text: chapter.body || "这一节还空着。" }));
      preview.append(block);
    });
  }

  function renderList() {
    list.replaceChildren();
    if (!drafts.length) {
      list.append(h("li", { class: "empty-note", text: "这台设备上还没有草稿。" }));
      return;
    }
    drafts
      .slice()
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .forEach((draft) => {
        const spec = TEMPLATES[draft.template];
        const edit = h("button", { type: "button", class: "text-btn", text: "编辑" });
        const print = h("a", { class: "text-btn", href: "print.html?kind=draft&id=" + encodeURIComponent(draft.id), text: "打印 / 另存为 PDF" });
        const remove = h("button", { type: "button", class: "text-btn", text: "删除" });
        edit.addEventListener("click", () => {
          current = JSON.parse(JSON.stringify(draft));
          syncForm();
          publishNote.hidden = !current.localPreview;
          say("已载入本机草稿，可以继续改。");
          form.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        remove.addEventListener("click", async () => {
          const ok = await window.HuashanhuConfirm("删除这份本机草稿？只影响这台设备，不能撤销。", "确认删除");
          if (!ok) return;
          drafts = drafts.filter((item) => item.id !== draft.id);
          if (current.id === draft.id) current = blank(current.template);
          if (writeStore()) {
            syncForm();
            renderList();
            say("已从这台设备删除。没有通知其他人。");
          }
        });
        list.append(
          h(
            "li",
            { class: "draft-card" },
            h("p", { class: "badge", text: spec.label + (draft.localPreview ? " · 仅本机预览 · 待上线" : " · 本机草稿") }),
            h("h3", { text: draft.title || "未命名草稿" }),
            h("p", { class: "meta", text: domainLabel(draft.domain) + " · " + draft.chapters.length + " 节 · 其他人看不到 · 不加积分" }),
            h("div", { class: "actions" }, edit, print, remove),
          ),
        );
      });
  }

  function saveCurrent() {
    readForm();
    if (!current.title) {
      say("先写一个标题，再保存到这台设备。");
      form.elements.title.focus();
      return false;
    }
    if (!current.id) current.id = uid();
    current.updatedAt = new Date().toISOString();
    const copy = JSON.parse(JSON.stringify(current));
    const index = drafts.findIndex((item) => item.id === copy.id);
    if (index >= 0) drafts[index] = copy;
    else drafts.push(copy);
    if (!writeStore()) return false;
    renderList();
    return true;
  }

  root.querySelectorAll("[data-pick-template]").forEach((button) => {
    button.addEventListener("click", () => {
      const template = button.getAttribute("data-pick-template");
      if (!TEMPLATES[template]) return;
      current = blank(template);
      publishNote.hidden = true;
      preview.hidden = true;
      syncForm();
      root.querySelectorAll("[data-pick-template]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      say(TEMPLATES[template].label + "模板已准备好。结构和其他模板不同，还没有保存。");
    });
  });

  root.querySelector("[data-add-chapter]").addEventListener("click", () => {
    current.chapters.push({ id: uid(), heading: "新的一节", body: "" });
    renderChapterEditors();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (saveCurrent()) say("已保存在这台浏览器。其他人看不到，也没有公开，积分没有变化。");
  });

  root.querySelector("[data-preview]").addEventListener("click", () => {
    renderPreview();
    say("这是当前表单的预览，还在这台设备上。");
  });

  root.querySelector("[data-local-preview]").addEventListener("click", async () => {
    const result = await window.HuashanhuApi.publishCourse();
    if (result.ok) {
      say("后台返回了意外的成功状态。本页不会把它当成已经公开。");
      return;
    }
    current.localPreview = true;
    if (!saveCurrent()) return;
    publishNote.hidden = false;
    say("只标成仅本机预览，待上线。没有发给其他人，没有进入社区，也没有增加积分。");
  });

  root.querySelector("[data-print-current]").addEventListener("click", () => {
    if (!saveCurrent()) return;
    window.location.href = "print.html?kind=draft&id=" + encodeURIComponent(current.id);
  });

  function applyExamples() {
    const params = new URLSearchParams(location.search);
    const domain = params.get("domain") || "";
    const kind = params.get("kind") || "";
    const q = (params.get("q") || "").trim().toLowerCase();
    const query = root.querySelector("[data-example-q]");
    if (query && document.activeElement !== query) query.value = params.get("q") || "";
    root.querySelectorAll("[data-set-domain]").forEach((button) => {
      button.setAttribute("aria-pressed", String((button.getAttribute("data-set-domain") || "") === domain));
    });
    root.querySelectorAll("[data-set-kind]").forEach((button) => {
      button.setAttribute("aria-pressed", String((button.getAttribute("data-set-kind") || "") === kind));
    });
    let visible = 0;
    root.querySelectorAll("[data-example]").forEach((card) => {
      const hay = (card.getAttribute("data-search") || "").toLowerCase();
      const show = (!domain || card.getAttribute("data-domain") === domain) && (!kind || card.getAttribute("data-kind") === kind) && (!q || hay.includes(q));
      card.hidden = !show;
      if (show) visible += 1;
    });
    const count = root.querySelector("[data-example-count]");
    if (count) count.textContent = visible ? "当前显示 " + visible + " 条示例。它们不是真实用户刚刚发布的内容。" : "没有匹配的示例。";
  }

  function updateExampleUrl(next) {
    const params = new URLSearchParams(location.search);
    ["domain", "kind", "q"].forEach((key) => {
      if (next[key]) params.set(key, next[key]);
      else params.delete(key);
    });
    const qs = params.toString();
    history.pushState({}, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    applyExamples();
  }

  root.querySelector("[data-example-form]").addEventListener("submit", (event) => event.preventDefault());
  root.querySelector("[data-example-q]").addEventListener("input", (event) => {
    const params = new URLSearchParams(location.search);
    updateExampleUrl({ domain: params.get("domain") || "", kind: params.get("kind") || "", q: event.target.value.trim() });
  });
  root.querySelectorAll("[data-set-domain]").forEach((button) => {
    button.addEventListener("click", () => {
      const params = new URLSearchParams(location.search);
      updateExampleUrl({ domain: button.getAttribute("data-set-domain") || "", kind: params.get("kind") || "", q: params.get("q") || "" });
    });
  });
  root.querySelectorAll("[data-set-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      const params = new URLSearchParams(location.search);
      updateExampleUrl({ domain: params.get("domain") || "", kind: button.getAttribute("data-set-kind") || "", q: params.get("q") || "" });
    });
  });
  window.addEventListener("popstate", applyExamples);

  const initial = root.querySelector("[data-pick-template='text']");
  if (initial) initial.setAttribute("aria-pressed", "true");
  readStore();
  syncForm();
  renderList();
  applyExamples();
  if (location.hash === "#works") {
    updateExampleUrl({ domain: "", kind: "work", q: "" });
  }
})();
