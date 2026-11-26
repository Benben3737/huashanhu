(function () {
  const root = document.querySelector("[data-backup]");
  if (!root || !window.HuashanhuStore) return;
  const store = window.HuashanhuStore;
  const status = root.querySelector("[data-backup-status]");
  const FORMAT = "huashanhu-backup";
  const VERSION = 1;
  const TEMPLATES = ["text", "experience", "technical"];
  const SENSITIVE = /password|token|secret|apikey|api_key|credential/i;

  function say(text) {
    if (status) status.textContent = text;
  }

  function text(value) {
    return typeof value === "string" ? value : "";
  }

  function cleanDraft(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (typeof item.title !== "string" || !TEMPLATES.includes(item.template)) return null;
    if (!Array.isArray(item.chapters)) return null;
    const chapters = [];
    for (const chapter of item.chapters) {
      if (!chapter || typeof chapter !== "object" || typeof chapter.heading !== "string" || typeof chapter.body !== "string") return null;
      chapters.push({ id: text(chapter.id), heading: chapter.heading, body: chapter.body });
    }
    return {
      id: text(item.id),
      template: item.template,
      title: item.title,
      domain: text(item.domain) || "other",
      summary: text(item.summary),
      materials: text(item.materials),
      chapters: chapters,
      localPreview: Boolean(item.localPreview),
      updatedAt: text(item.updatedAt),
    };
  }

  function cleanNote(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const note = {
      id: text(item.id),
      sharer: text(item.sharer),
      course: text(item.course),
      domain: text(item.domain) || "other",
      progress: text(item.progress),
      reflection: text(item.reflection),
      feeling: text(item.feeling),
      shareFeeling: Boolean(item.shareFeeling),
      updatedAt: text(item.updatedAt),
    };
    if (!note.id) return null;
    return note;
  }

  function readCurrent() {
    const drafts = store.load("drafts", []);
    const notes = store.load("study-notes", []);
    if (!drafts.ok || !notes.ok || !Array.isArray(drafts.value) || !Array.isArray(notes.value)) {
      return { ok: false, message: store.storageMessage({ ok: false, reason: "corrupt" }) + "这次没有导出，也没有覆盖。" };
    }
    return {
      ok: true,
      drafts: drafts.value.map(cleanDraft).filter(Boolean),
      notes: notes.value.map(cleanNote).filter(Boolean),
    };
  }

  function payloadFrom(current) {
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        drafts: current.drafts,
        studyNotes: current.notes,
      },
    };
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function parseBackup(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return { ok: false, message: "这个文件不是可读的 JSON。现有记录没有被覆盖。" };
    }
    if (!parsed || typeof parsed !== "object" || parsed.format !== FORMAT || parsed.version !== VERSION) {
      return { ok: false, message: "这份备份的格式版本不能识别。现有记录没有被覆盖。" };
    }
    const data = parsed.data;
    if (!data || !Array.isArray(data.drafts) || !Array.isArray(data.studyNotes)) {
      return { ok: false, message: "备份里缺少草稿或笔记列表。现有记录没有被覆盖。" };
    }
    const blob = JSON.stringify(parsed);
    if (SENSITIVE.test(blob) && /"(password|token|secret|apiKey)"\s*:/.test(blob)) {
      return { ok: false, message: "备份里有不允许导入的凭据字段。现有记录没有被覆盖。" };
    }
    const drafts = [];
    for (const item of data.drafts) {
      const clean = cleanDraft(item);
      if (!clean) return { ok: false, message: "有一条草稿无法校验。现有记录没有被覆盖。" };
      drafts.push(clean);
    }
    const notes = [];
    for (const item of data.studyNotes) {
      const clean = cleanNote(item);
      if (!clean) return { ok: false, message: "有一条学习笔记无法校验。现有记录没有被覆盖。" };
      notes.push(clean);
    }
    return { ok: true, drafts: drafts, notes: notes };
  }

  root.querySelector("[data-export]").addEventListener("click", () => {
    const current = readCurrent();
    if (!current.ok) {
      say(current.message);
      return;
    }
    const payload = payloadFrom(current);
    downloadBlob("huashanhu-backup.json", new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    say("已下载 huashanhu-backup.json。里面是这台设备上的草稿和笔记，含格式版本与生成时间。没有密钥或登录令牌，也没有上传到 GitHub。");
  });

  root.querySelector("[data-import]").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const raw = await file.text();
    const parsed = parseBackup(raw);
    if (!parsed.ok) {
      say(parsed.message);
      return;
    }
    const current = readCurrent();
    if (!current.ok) {
      say(current.message);
      return;
    }
    if (current.drafts.length || current.notes.length) {
      const ok = await window.HuashanhuConfirm(
        "导入会覆盖这台设备上现有的草稿和学习笔记，包括评价同意。站点示例不会变。此操作不能自动撤销。",
        "确认导入",
      );
      if (!ok) {
        say("已取消导入。现有记录还在。");
        return;
      }
    }
    const savedDrafts = store.save("drafts", parsed.drafts);
    if (!savedDrafts.ok) {
      say(store.storageMessage(savedDrafts) + "现有记录没有被覆盖。");
      return;
    }
    const savedNotes = store.save("study-notes", parsed.notes);
    if (!savedNotes.ok) {
      store.save("drafts", current.drafts);
      say(store.storageMessage(savedNotes) + "已退回导入前的草稿。");
      return;
    }
    say("导入成功，正在刷新页面。这些内容只在这台浏览器里，没有同步到其他设备。");
    window.location.reload();
  });

  root.querySelector("[data-reset-records]").addEventListener("click", async () => {
    const ok = await window.HuashanhuConfirm(
      "恢复初始框架会清空这台设备上你自己的草稿、学习笔记和评价同意。示例课程和页面框架会保留。此操作不能撤销。",
      "确认清空",
    );
    if (!ok) {
      say("已取消。你的记录还在。");
      return;
    }
    const result = store.clearLocal();
    if (!result.ok) {
      say(store.storageMessage(result));
      return;
    }
    window.location.reload();
  });

  const SITE_FILES = window.HUASHANHU_SITE_FILES || [];

  root.querySelector("[data-download-site]").addEventListener("click", async () => {
    const includePrivate = root.querySelector("[data-include-private]").checked;
    say("正在收集站点文件。");
    try {
      const files = [];
      for (const path of SITE_FILES) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(path);
        files.push({ name: path, data: new Uint8Array(await response.arrayBuffer()) });
      }
      if (includePrivate) {
        const current = readCurrent();
        if (!current.ok) {
          say(current.message);
          return;
        }
        const note = "这是导出时可选附上的本机记录，不是站点示例。它不会自动上传到 GitHub，也不能代替跨设备同步。\n";
        files.push({ name: "private/README.txt", data: new TextEncoder().encode(note) });
        files.push({ name: "private/local-backup.json", data: new TextEncoder().encode(JSON.stringify(payloadFrom(current), null, 2)) });
      }
      const zip = buildZip(files);
      downloadBlob("huashanhu-site.zip", new Blob([zip], { type: "application/zip" }));
      say(includePrivate
        ? "已下载 huashanhu-site.zip。压缩包里是完整静态页面和资源，私人草稿放在 private/ 目录，和示例内容分开。它还没有上传到 GitHub。"
        : "已下载 huashanhu-site.zip。压缩包里是页面和资源，没有包含私人草稿。它还没有上传到 GitHub。");
    } catch (error) {
      say("有站点文件没有取到，所以没有给出不完整的压缩包。");
    }
  });

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildZip(files) {
    const encoder = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    files.forEach((file) => {
      const name = encoder.encode(file.name);
      const crc = crc32(file.data);
      const local = new Uint8Array(30);
      const view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(8, 0, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, file.data.length, true);
      view.setUint32(22, file.data.length, true);
      view.setUint16(26, name.length, true);
      const record = new Uint8Array(46);
      const recordView = new DataView(record.buffer);
      recordView.setUint32(0, 0x02014b50, true);
      recordView.setUint16(4, 20, true);
      recordView.setUint16(6, 20, true);
      recordView.setUint32(16, crc, true);
      recordView.setUint32(20, file.data.length, true);
      recordView.setUint32(24, file.data.length, true);
      recordView.setUint16(28, name.length, true);
      recordView.setUint32(42, offset, true);
      parts.push(local, name, file.data);
      central.push(record, name);
      offset += local.length + name.length + file.data.length;
    });
    const centralStart = offset;
    let centralSize = 0;
    central.forEach((part) => { centralSize += part.length; });
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralStart, true);
    const blobParts = parts.concat(central, [end]);
    const total = blobParts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let cursor = 0;
    blobParts.forEach((part) => {
      out.set(part, cursor);
      cursor += part.length;
    });
    return out;
  }

  window.HuashanhuBackup = { parseBackup: parseBackup, buildZip: buildZip, payloadFrom: payloadFrom, readCurrent: readCurrent };
})();
