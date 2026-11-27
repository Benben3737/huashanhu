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
  const taxonomy = window.HuashanhuTaxonomy;
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
  let domainBinder = null;

  function blank(template) {
    const spec = TEMPLATES[template];
    return {
      id: "",
      template,
      title: "",
      domain: "",
      sub: "",
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

  function domainLabel(domain, sub) {
    return taxonomy.label(domain, sub);
  }

  function syncForm() {
    const spec = TEMPLATES[current.template];
    form.elements.title.value = current.title;
    const stored = taxonomy.selectStored(form.elements.domain, current.domain, current.sub);
    domainBinder.apply(stored.legacy ? "" : stored.sub);
    form.elements.summary.value = current.summary;
    form.elements.materials.value = current.materials || "";
    const labelKey = "community.template." + current.template;
    const summaryKey = labelKey + ".summary";
    if (templateName) templateName.setAttribute("data-copy", labelKey);
    if (summaryLabel) summaryLabel.setAttribute("data-copy", summaryKey);
    templateName.textContent = window.HuashanhuCopy ? window.HuashanhuCopy.text(labelKey, spec.label) : spec.label;
    summaryLabel.textContent = window.HuashanhuCopy ? window.HuashanhuCopy.text(summaryKey, spec.summaryLabel) : spec.summaryLabel;
    materialsField.hidden = !spec.materials;
    renderChapterEditors();
  }

  function readForm() {
    current.title = form.elements.title.value.trim();
    const chosen = domainBinder.read();
    current.domain = chosen.domain;
    current.sub = chosen.legacy ? current.sub || "" : chosen.sub;
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
      h("p", { class: "meta", text: domainLabel(current.domain, current.sub) + " · 还没有公开" }),
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
            h("p", { class: "meta", text: domainLabel(draft.domain, draft.sub) + " · " + draft.chapters.length + " 节 · 其他人看不到 · 不加积分" }),
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
    const chosen = domainBinder.read();
    if (!chosen.legacy && !taxonomy.placement(current.domain, current.sub)) {
      say(current.domain ? "这个项目还要选一个子项目。" : "先选择项目，再保存到这台设备。");
      (current.domain ? form.elements.sub : form.elements.domain).focus();
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

  function readFilter() {
    const params = new URLSearchParams(location.search);
    return {
      side: params.get("side") || "",
      domain: params.get("domain") || "",
      sub: params.get("sub") || "",
      kind: params.get("kind") || "",
      q: params.get("q") || "",
    };
  }

  function writeFilter(next, hash) {
    const params = new URLSearchParams();
    ["side", "domain", "sub", "kind", "q"].forEach((key) => {
      if (next[key]) params.set(key, next[key]);
    });
    const qs = params.toString();
    const nextHash = hash === undefined ? location.hash : hash;
    history.pushState({}, "", location.pathname + (qs ? "?" + qs : "") + (nextHash || ""));
    applyExamples();
  }

  function directExamples(section) {
    const body = section.querySelector(":scope > .entry-body");
    return body ? Array.from(body.querySelectorAll("[data-example]")) : [];
  }

  function entryOpened(domain, sub, note) {
    if (!domain) return false;
    const subHost = note.closest("[data-tax-sub]");
    if (subHost) {
      return subHost.getAttribute("data-domain") === domain && (!sub || subHost.getAttribute("data-sub") === sub);
    }
    const projectHost = note.closest("[data-tax-project]");
    return Boolean(projectHost && projectHost.getAttribute("data-tax-project") === domain && !sub && !projectHost.querySelector("[data-tax-sub]"));
  }

  function applyExamples() {
    const raw = readFilter();
    let side = raw.side;
    let domain = raw.domain;
    let sub = raw.sub;
    const kind = raw.kind;
    const q = raw.q.trim().toLowerCase();
    let note = "";
    let jump = false;

    if (!domain && side && !taxonomy.sides.some((item) => item.id === side)) {
      note = "这个链接没有对应的一侧，下面仍是全部目录。";
      side = "";
    }

    const mapped = taxonomy.alias(domain);
    if (mapped) {
      domain = mapped.domain;
      sub = mapped.sub;
      side = "";
      const params = new URLSearchParams(location.search);
      params.set("domain", domain);
      if (sub) params.set("sub", sub);
      else params.delete("sub");
      params.delete("side");
      const hash = sub ? "#sub-" + domain + "-" + sub : "#domain-" + domain;
      history.replaceState({}, "", location.pathname + "?" + params.toString() + hash);
      jump = true;
    } else if (domain && !taxonomy.project(domain)) {
      note = "这个链接没有对应的项目，下面仍是全部目录。";
      domain = "";
      sub = "";
      side = "";
    } else if (domain && sub && !taxonomy.childOf(domain, sub)) {
      note = "这个子项目链接已经不在目录里，打开的是上一级项目。";
      sub = "";
    }

    let filterSide = side;
    if (domain) {
      const owner = taxonomy.sideOf(domain);
      filterSide = owner ? owner.id : "";
    }
    const narrowing = Boolean(kind || q);

    const query = root.querySelector("[data-example-q]");
    if (query && document.activeElement !== query) query.value = raw.q;
    root.querySelectorAll("[data-set-kind]").forEach((button) => {
      button.setAttribute("aria-pressed", String((button.getAttribute("data-set-kind") || "") === kind));
    });
    root.querySelectorAll("[data-tax-link]").forEach((link) => {
      const linkDomain = link.getAttribute("data-domain") || "";
      const linkSub = link.getAttribute("data-sub") || "";
      const linkSide = link.getAttribute("data-side") || "";
      let current = false;
      if (linkSub) current = domain === linkDomain && sub === linkSub;
      else if (linkDomain) current = domain === linkDomain && !sub;
      else if (linkSide) current = !domain && filterSide === linkSide;
      else current = !domain && !filterSide;
      link.setAttribute("aria-current", current ? "page" : "false");
    });

    root.querySelectorAll("[data-example]").forEach((card) => {
      const hay = (card.getAttribute("data-search") || "").toLowerCase();
      card.hidden = Boolean((kind && card.getAttribute("data-kind") !== kind) || (q && !hay.includes(q)));
    });

    root.querySelectorAll("[data-tax-sub]").forEach((section) => {
      const sectionDomain = section.getAttribute("data-domain");
      const sectionSub = section.getAttribute("data-sub");
      let show = !domain || sectionDomain === domain;
      if (sub) show = sectionDomain === domain && sectionSub === sub;
      const selected = domain === sectionDomain && sub === sectionSub;
      if (show && narrowing && !selected && !directExamples(section).some((card) => !card.hidden)) show = false;
      section.hidden = !show;
    });

    root.querySelectorAll("[data-tax-project]").forEach((section) => {
      const sectionDomain = section.getAttribute("data-tax-project");
      let show = !domain || sectionDomain === domain;
      if (show && !domain && filterSide) show = taxonomy.sideOf(sectionDomain) && taxonomy.sideOf(sectionDomain).id === filterSide;
      const selected = domain === sectionDomain;
      if (show && narrowing && !selected) {
        const own = directExamples(section).some((card) => !card.hidden);
        const child = Array.from(section.querySelectorAll(":scope > [data-tax-sub]")).some((item) => !item.hidden);
        if (!own && !child) show = false;
      }
      section.hidden = !show;
    });

    root.querySelectorAll("[data-tax-side]").forEach((section) => {
      const id = section.getAttribute("data-tax-side");
      let show = !filterSide || id === filterSide;
      if (show && narrowing && !domain) {
        show = Array.from(section.querySelectorAll("[data-tax-project]")).some((item) => !item.hidden);
      }
      section.hidden = !show;
    });

    root.querySelectorAll("[data-entry-empty]").forEach((empty) => {
      empty.hidden = !entryOpened(domain, sub, empty);
    });

    let visible = 0;
    root.querySelectorAll("[data-example]").forEach((card) => {
      if (!card.hidden && !card.closest("[hidden]")) visible += 1;
    });
    const scopeHasExamples = Array.from(root.querySelectorAll("[data-example]")).some((card) => {
      if (!domain) return true;
      if ((card.getAttribute("data-domain") || "") !== domain) return false;
      if (sub && (card.getAttribute("data-sub") || "") !== sub) return false;
      return true;
    });
    const count = root.querySelector("[data-example-count]");
    if (count) {
      const prefix = note ? note + " " : "";
      if (!domain && note) count.textContent = note;
      else if (visible) count.textContent = prefix + "当前显示 " + visible + " 条示例。它们不是真实用户刚刚发布的内容。";
      else if (domain && !scopeHasExamples) count.textContent = note || "这里还没有内容。";
      else if (kind || q) count.textContent = prefix + "没有匹配的示例。";
      else if (domain) count.textContent = note || "这里还没有内容。";
      else count.textContent = "当前显示 0 条示例。它们不是真实用户刚刚发布的内容。";
    }
    if (jump && location.hash) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView({ block: "start" });
    }
  }

  root.querySelector("[data-example-form]").addEventListener("submit", (event) => event.preventDefault());
  root.querySelector("[data-example-q]").addEventListener("input", (event) => {
    const currentFilter = readFilter();
    writeFilter(Object.assign({}, currentFilter, { q: event.target.value.trim() }));
  });
  root.querySelectorAll("[data-tax-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const url = new URL(link.href, location.href);
      history.pushState({}, "", url.pathname + url.search + url.hash);
      applyExamples();
      const target = url.hash ? document.querySelector(url.hash) : document.getElementById("catalog");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  root.querySelectorAll("[data-set-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      const currentFilter = readFilter();
      writeFilter({
        side: currentFilter.side,
        domain: currentFilter.domain,
        sub: currentFilter.sub,
        kind: button.getAttribute("data-set-kind") || "",
        q: currentFilter.q,
      });
    });
  });
  window.addEventListener("popstate", applyExamples);

  const initial = root.querySelector("[data-pick-template='text']");
  if (initial) initial.setAttribute("aria-pressed", "true");
  document.addEventListener("huashanhu-copy", () => {
    const spec = TEMPLATES[current.template];
    if (!spec || !templateName || !summaryLabel) return;
    const labelKey = "community.template." + current.template;
    const summaryKey = labelKey + ".summary";
    templateName.textContent = window.HuashanhuCopy.text(labelKey, spec.label);
    summaryLabel.textContent = window.HuashanhuCopy.text(summaryKey, spec.summaryLabel);
    renderList();
  });

  domainBinder = taxonomy.bindDomainSelect(form.elements.domain, form.elements.sub);
  readStore();
  syncForm();
  renderList();
  applyExamples();
  if (location.hash === "#works") {
    history.replaceState({}, "", location.pathname + "?kind=work#catalog");
    applyExamples();
  }
})();
