(function (global) {
  const PREFIX = "huashanhu.v1.";
  const LEGACY_KEYS = ["skill-space-student-view"];

  function isQuota(error) {
    return Boolean(error && (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014));
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw == null) return { ok: true, empty: true, value: fallback };
      return { ok: true, empty: false, value: JSON.parse(raw) };
    } catch (error) {
      return { ok: false, reason: "corrupt", value: fallback, error };
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: isQuota(error) ? "quota" : "unavailable", error };
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: "unavailable", error };
    }
  }

  function clearLocal() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const name = localStorage.key(i);
        if (name && (name.startsWith(PREFIX) || LEGACY_KEYS.includes(name))) keys.push(name);
      }
      keys.forEach((name) => localStorage.removeItem(name));
      return { ok: true, removed: keys.length };
    } catch (error) {
      return { ok: false, reason: "unavailable", error };
    }
  }

  function h(tag, props) {
    const node = document.createElement(tag);
    const attrs = props || {};
    Object.keys(attrs).forEach((key) => {
      const value = attrs[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = String(value);
      else if (key === "text") node.textContent = String(value);
      else if (key === "htmlFor") node.htmlFor = String(value);
      else node.setAttribute(key, value === true ? "" : String(value));
    });
    for (let i = 2; i < arguments.length; i += 1) {
      const child = arguments[i];
      if (child == null || child === false) continue;
      node.append(child);
    }
    return node;
  }

  function storageMessage(result) {
    if (!result || result.ok) return "";
    if (result.reason === "quota") return "这台浏览器的保存空间不够，这一次没有写入。";
    if (result.reason === "corrupt") return "这台设备上的本机数据无法读取。可以清除后重新开始，清除前不会覆盖它。";
    return "这台浏览器暂时不能保存。内容还留在当前页面上，没有共享。";
  }

  global.HuashanhuStore = {
    PREFIX,
    load,
    save,
    remove,
    clearLocal,
    h,
    storageMessage,
  };
})(window);
