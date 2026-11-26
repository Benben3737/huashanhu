(function (global) {
  const copies = {};

  function text(key, fallback) {
    return Object.prototype.hasOwnProperty.call(copies, key) ? copies[key] : fallback;
  }

  function fields() {
    return Array.from(document.querySelectorAll("[data-copy]"));
  }

  function apply() {
    fields().forEach((el) => {
      const key = el.getAttribute("data-copy");
      if (key && Object.prototype.hasOwnProperty.call(copies, key)) el.textContent = copies[key];
    });
    document.dispatchEvent(new CustomEvent("huashanhu-copy"));
  }

  function plain(value) {
    return String(value).replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim().slice(0, 4000);
  }

  let editing = false;
  const started = new Map();

  function mount(barStatus) {
    if (document.querySelector("[data-copy-bar]")) return;
    const bar = document.createElement("div");
    bar.className = "copy-bar no-print";
    bar.setAttribute("data-copy-bar", "");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "text-btn";
    open.setAttribute("data-copy-open", "");
    open.textContent = "网站文本编辑";
    const mode = document.createElement("span");
    mode.className = "copy-mode";
    mode.setAttribute("data-copy-mode", "");
    mode.hidden = true;
    mode.textContent = "编辑版";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "primary-btn";
    save.setAttribute("data-copy-save", "");
    save.hidden = true;
    save.textContent = "确定";
    const status = document.createElement("span");
    status.setAttribute("data-copy-status", "");
    status.setAttribute("role", "status");
    status.textContent = barStatus || "";
    bar.append(open, mode, save, status);
    document.body.append(bar);

    function say(message) {
      status.textContent = message;
    }

    function setEditing(on) {
      editing = on;
      open.hidden = on;
      mode.hidden = !on;
      save.hidden = !on;
      started.clear();
      fields().forEach((el) => {
        if (on) {
          started.set(el, plain(el.textContent));
          el.setAttribute("contenteditable", "plaintext-only");
          el.classList.add("is-copy-editing");
        } else {
          el.removeAttribute("contenteditable");
          el.classList.remove("is-copy-editing");
        }
      });
    }

    open.addEventListener("click", () => {
      setEditing(true);
      say("可以直接改页面上的文字。确定后写入 CloudBase。");
    });

    save.addEventListener("click", async () => {
      const changed = {};
      fields().forEach((el) => {
        const key = el.getAttribute("data-copy");
        if (!key) return;
        const next = plain(el.textContent);
        if (next !== started.get(el)) changed[key] = next;
      });
      if (!Object.keys(changed).length) {
        setEditing(false);
        say("没有改动。没有写入。");
        return;
      }
      save.disabled = true;
      const result = await global.HuashanhuCloud.saveCopy(changed);
      save.disabled = false;
      if (!result.ok) {
        say(result.message || "没有写入。");
        return;
      }
      Object.keys(changed).forEach((key) => {
        copies[key] = changed[key];
      });
      apply();
      setEditing(false);
      say("已写入 CloudBase。刷新、换一台设备或其他访客也会看到这些文字。");
    });

    document.addEventListener("click", (event) => {
      if (!editing) return;
      if (event.target.closest("[data-copy-bar]")) return;
      const editable = event.target.closest("[data-copy]");
      if (!editable) return;
      const control = event.target.closest("a, button");
      if (control && (control === editable || control.contains(editable))) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    document.addEventListener("paste", (event) => {
      if (!editing || !event.target.closest("[data-copy]")) return;
      event.preventDefault();
      const incoming = (event.clipboardData || global.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, incoming);
    });

    document.addEventListener("input", (event) => {
      if (!editing) return;
      const el = event.target.closest ? event.target.closest("[data-copy]") : null;
      if (!el) return;
      const key = el.getAttribute("data-copy");
      const next = el.textContent;
      fields().forEach((other) => {
        if (other !== el && other.getAttribute("data-copy") === key) other.textContent = next;
      });
    });
  }

  async function start() {
    let loaded = false;
    if (global.HuashanhuCloud && global.HuashanhuCloud.configured()) {
      const listed = await global.HuashanhuCloud.listCopy();
      if (listed.ok && listed.data && listed.data.copies) {
        loaded = true;
        Object.keys(listed.data.copies).forEach((key) => {
          if (typeof listed.data.copies[key] === "string") copies[key] = listed.data.copies[key];
        });
        apply();
      }
    }
    const session = global.HuashanhuAuth && global.HuashanhuAuth.session();
    if (!session || !global.HuashanhuCloud) return;
    const who = await global.HuashanhuCloud.whoami();
    if (!who.ok || !who.data || who.data.role !== "founder") return;
    mount(loaded ? "" : "还没读到已保存的文本。现在按确定，会把页面上的文字写到 CloudBase。");
  }

  global.HuashanhuCopy = { text: text, apply: apply };
  start();
})(window);
