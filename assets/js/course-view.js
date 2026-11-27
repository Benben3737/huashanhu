(function () {
  const root = document.querySelector("[data-course-view]");
  if (!root || !window.HuashanhuCloud) return;
  const h = window.HuashanhuStore.h;
  const id = new URLSearchParams(location.search).get("id") || "";
  if (!window.HuashanhuAuth.session()) return;
  if (!id) {
    root.append(h("p", { text: "没有课程编号。" }));
    return;
  }
  if (!window.HuashanhuCloud.configured()) {
    root.append(h("p", { text: "CloudBase 云函数地址还没填写。没有读取课程正文。" }));
    return;
  }
  window.HuashanhuCloud.getCourse(id).then((result) => {
    root.replaceChildren();
    if (!result.ok) {
      root.append(h("p", { text: result.message || "没有读到课程正文。" }));
      return;
    }
    const course = result.data.course;
    root.append(
      h("p", { class: "badge", text: "来自 CloudBase" }),
      h("h1", { text: course.title || "未命名" }),
      h("p", { class: "meta", text: [(window.HuashanhuTaxonomy ? window.HuashanhuTaxonomy.label(course.domain, course.sub) : ""), course.authorName || "受邀成员", "只对已登录的受邀用户显示正文"].filter(Boolean).join(" · ") }),
      h("p", { text: course.summary || "" }),
    );
    (course.chapters || []).forEach((chapter, index) => {
      root.append(h("h2", { text: index + 1 + ". " + (chapter.heading || "未命名小节") }), h("p", { class: "pre", text: chapter.body || "" }));
    });
  }).catch(() => {
    root.append(h("p", { text: "没有连上 CloudBase。没有显示课程正文。" }));
  });
})();
