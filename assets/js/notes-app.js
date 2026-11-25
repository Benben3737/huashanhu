(function () {
  const root = document.querySelector("[data-notes-app]");
  if (!root) return;
  const store = window.HuashanhuStore;
  const h = store.h;
  const form = root.querySelector("[data-note-form]");
  const status = root.querySelector("[data-note-status]");
  const list = root.querySelector("[data-note-list]");
  const reviews = root.querySelector("[data-review-list]");
  const storageNote = root.querySelector("[data-storage-note]");
  let notes = [];
  let storageBlocked = false;
  let currentId = "";
  let timer = 0;
  let silence = false;

  function say(text) {
    status.textContent = text;
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "note-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function readStore() {
    const result = store.load("study-notes", []);
    if (!result.ok || !Array.isArray(result.value)) {
      storageBlocked = true;
      notes = [];
      storageNote.textContent = store.storageMessage({ ok: false, reason: "corrupt" });
      return;
    }
    notes = result.value.filter((item) => item && typeof item === "object");
  }

  function writeStore() {
    if (storageBlocked) {
      say("本机笔记无法读取。请先清除损坏的数据。这一次没有覆盖，也没有共享。");
      return false;
    }
    const result = store.save("study-notes", notes);
    if (!result.ok) {
      say(store.storageMessage(result) + "没有共享。");
      return false;
    }
    return true;
  }

  function fromForm() {
    return {
      id: currentId || uid(),
      sharer: form.elements.sharer.value.trim(),
      course: form.elements.course.value.trim(),
      domain: form.elements.domain.value,
      progress: form.elements.progress.value.trim(),
      reflection: form.elements.reflection.value.trim(),
      feeling: form.elements.feeling.value.trim(),
      shareFeeling: Boolean(form.elements.shareFeeling.checked),
      updatedAt: new Date().toISOString(),
    };
  }

  function fill(note) {
    currentId = note.id;
    form.elements.sharer.value = note.sharer || "";
    form.elements.course.value = note.course || "";
    form.elements.domain.value = note.domain || "other";
    form.elements.progress.value = note.progress || "";
    form.elements.reflection.value = note.reflection || "";
    form.elements.feeling.value = note.feeling || "";
    form.elements.shareFeeling.checked = Boolean(note.shareFeeling);
  }

  function domainLabel(value) {
    const option = form.querySelector('option[value="' + value + '"]');
    return option ? option.textContent : "其他";
  }

  function render() {
    list.replaceChildren();
    if (!notes.length) list.append(h("li", { class: "empty-note", text: "这台设备上还没有学习笔记。" }));
    notes
      .slice()
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .forEach((note) => {
        const edit = h("button", { type: "button", class: "text-btn", text: "编辑" });
        const remove = h("button", { type: "button", class: "text-btn", text: "删除" });
        const print = h("a", {
          class: "text-btn",
          href: "print.html?kind=note&id=" + encodeURIComponent(note.id),
          text: "打印 / 另存为 PDF",
        });
        edit.addEventListener("click", () => {
          fill(note);
          say("已载入这条本机笔记。学习进度仍然只在这台设备上。");
        });
        remove.addEventListener("click", async () => {
          const ok = await window.HuashanhuConfirm("删除这条本机学习笔记？只影响这台设备，不能撤销。", "确认删除");
          if (!ok) return;
          notes = notes.filter((item) => item.id !== note.id);
          if (currentId === note.id) {
            silence = true;
            currentId = "";
            form.reset();
            form.elements.shareFeeling.checked = false;
            silence = false;
          }
          if (writeStore()) {
            render();
            say("已从这台设备删除。没有公开学习进度。");
          }
        });
        list.append(
          h(
            "li",
            { class: "draft-card" },
            h("p", { class: "badge", text: "本机私有" }),
            h("h3", { text: note.course || "未填写课程" }),
            h("p", { class: "meta", text: (note.sharer || "未填写分享者") + " · " + domainLabel(note.domain) }),
            h("p", { text: "进度和感悟不在这张卡片上展开。打开编辑才能看到全文。" }),
            h("div", { class: "actions" }, edit, print, remove),
          ),
        );
      });

    reviews.replaceChildren();
    const shared = notes.filter((note) => note.shareFeeling && note.feeling);
    if (!shared.length) {
      reviews.append(h("li", { class: "empty-note", text: "还没有允许纳入评价预览的课程感受。私人感悟和学习进度不会出现在这里。" }));
      return;
    }
    shared.forEach((note) => {
      const withdraw = h("button", { type: "button", class: "text-btn", text: "撤回这条感受" });
      withdraw.addEventListener("click", () => {
        note.shareFeeling = false;
        if (currentId === note.id) form.elements.shareFeeling.checked = false;
        if (writeStore()) {
          render();
          say("已撤回。这条感受不再进入本机评价预览。笔记正文还在这台设备上，没有公开。");
        }
      });
      reviews.append(
        h(
          "li",
          { class: "draft-card" },
          h("p", { class: "badge", text: "评价预览 · 仅本机 · 不是真实发布" }),
          h("h3", { text: note.course || "未填写课程" }),
          h("p", { class: "meta", text: "分享者：" + (note.sharer || "未填写") }),
          h("p", { class: "pre", text: note.feeling }),
          withdraw,
        ),
      );
    });
  }

  function persist(manual) {
    const note = fromForm();
    if (!note.course && !note.reflection && !note.feeling && !note.sharer && !note.progress) {
      if (manual) say("先写一点内容，再保存。空表单不会制造一条记录。");
      return;
    }
    currentId = note.id;
    const index = notes.findIndex((item) => item.id === note.id);
    if (index >= 0) notes[index] = note;
    else notes.push(note);
    if (!writeStore()) return;
    render();
    say(
      manual
        ? "已保存在这台设备，默认不共享。学习进度没有公开。" + (note.shareFeeling ? "你勾选了同意，只有课程感受进入本机评价预览。" : "同意未勾选，课程感受不会进入评价预览。")
        : "已自动保存在这台设备。自动保存不会共享，学习进度仍然私有。",
    );
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    persist(true);
  });
  form.addEventListener("input", () => {
    if (silence) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => persist(false), 500);
  });
  root.querySelector("[data-new-note]").addEventListener("click", () => {
    silence = true;
    window.clearTimeout(timer);
    currentId = "";
    form.reset();
    form.elements.shareFeeling.checked = false;
    silence = false;
    say("开始新的一条。还没有保存，也没有共享。");
  });
  root.querySelector("[data-print-note]").addEventListener("click", () => {
    persist(true);
    if (!currentId) return;
    window.location.href = "print.html?kind=note&id=" + encodeURIComponent(currentId);
  });

  readStore();
  form.elements.shareFeeling.checked = false;
  render();
})();
