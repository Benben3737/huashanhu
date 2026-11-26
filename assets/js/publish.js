(function () {
  const root = document.querySelector("[data-publish]");
  if (!root || !window.HuashanhuCloud) return;
  const h = window.HuashanhuStore.h;
  const gate = root.querySelector("[data-publish-gate]");
  const form = root.querySelector("[data-publish-form]");
  const status = root.querySelector("[data-publish-status]");
  const list = root.querySelector("[data-live-courses]");
  const session = window.HuashanhuAuth && window.HuashanhuAuth.session();

  function say(text) {
    status.textContent = text;
  }

  if (session) {
    gate.textContent = "已登录。提交会写入 CloudBase，作者是这次登录的身份，不会上传本机草稿。只有类型为课程时，服务器才记 1 分。";
    form.hidden = false;
  } else {
    gate.textContent = "请先完成邀请登录。未登录不会把内容写入 CloudBase。";
    form.hidden = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!window.HuashanhuAuth.session()) {
      say("请先完成邀请登录。没有写入。");
      return;
    }
    if (!window.HuashanhuCloud.configured()) {
      say("CloudBase 云函数地址还没填写。这次没有写入数据库。");
      return;
    }
    const course = {
      title: form.elements.title.value.trim(),
      kind: form.elements.kind.value,
      domain: form.elements.domain.value,
      summary: form.elements.summary.value.trim(),
      template: "text",
      materials: "",
      chapters: [{ heading: form.elements.heading.value.trim(), body: form.elements.body.value.trim() }],
    };
    const result = await window.HuashanhuCloud.publishCourse(course);
    if (!result.ok) {
      say(result.message || "没有写入。");
      return;
    }
    const points = result.data.pointsAwarded ? "这门课程已记 1 分。" : "这条不是专项课程，没有加分。";
    say("已写入 CloudBase，编号 " + result.data.id + "。" + points + " 这不是公开人数或同步成功的夸张提示。");
    form.reset();
    loadCatalog();
  });

  async function loadCatalog() {
    list.replaceChildren();
    if (!window.HuashanhuCloud.configured()) {
      list.append(h("p", { class: "empty-note", text: "CloudBase 云函数地址还没填写，所以这里还没有服务器上的课程目录。" }));
      return;
    }
    const result = await window.HuashanhuCloud.listCourses();
    if (!result.ok) {
      list.append(h("p", { class: "empty-note", text: result.message || "没有读到 CloudBase 目录。" }));
      return;
    }
    const courses = (result.data && result.data.courses) || [];
    if (!courses.length) {
      list.append(h("p", { class: "empty-note", text: "服务器上还没有已发布的课程。" }));
      return;
    }
    courses.forEach((course) => {
      const link = h("a", { href: "course.html?id=" + encodeURIComponent(course.id), text: course.title || "未命名" });
      list.append(
        h(
          "article",
          { class: "course-card" },
          h("p", { class: "badge", text: course.kind === "course" ? "课程" : course.kind === "work" ? "作品" : "心得" }),
          h("h3", {}, link),
          h("p", { text: course.summary || "没有简介。" }),
          h("p", { class: "meta", text: (course.authorName || "受邀成员") + " · 目录公开，正文需要邀请登录" }),
        ),
      );
    });
  }

  loadCatalog();
})();
