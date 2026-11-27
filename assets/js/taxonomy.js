(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HuashanhuTaxonomy = api;
})(typeof window !== "undefined" ? window : this, function () {
  // Keep ids in sync with cloudfunctions/huashanhu-api/taxonomy.js.
  const sides = [
    {
      id: "tech",
      label: "技术侧",
      projects: [
        { id: "music", label: "音乐", children: [] },
        {
          id: "art",
          label: "美术",
          children: [
            { id: "painting", label: "绘画" },
            { id: "design", label: "设计" },
          ],
        },
        {
          id: "body",
          label: "身体修习",
          children: [
            { id: "training", label: "运动健身训练" },
            { id: "rehab", label: "运动康复与体态矫正" },
            { id: "martial", label: "传统武道功法" },
            { id: "combat", label: "现代搏击格斗" },
          ],
        },
        { id: "mind", label: "心灵修习", children: [] },
        { id: "medicine", label: "医", children: [] },
        { id: "esoteric", label: "玄术", children: [] },
      ],
    },
    {
      id: "experience",
      label: "经验侧",
      projects: [
        {
          id: "philosophy",
          label: "哲学",
          children: [
            { id: "marxism", label: "马哲等" },
            { id: "aesthetics", label: "美学" },
          ],
        },
        { id: "travel", label: "旅行", children: [] },
        { id: "cooking", label: "烹饪饮食", children: [] },
        {
          id: "digital",
          label: "数码技术",
          children: [{ id: "programming", label: "程序开发" }],
        },
        {
          id: "media",
          label: "影像传媒",
          children: [{ id: "equipment", label: "器械" }],
        },
        { id: "craft", label: "手工造物", children: [] },
        { id: "language", label: "语言学习", children: [] },
        {
          id: "business",
          label: "商务办公",
          children: [{ id: "social", label: "人情世故" }],
        },
        { id: "care", label: "生活养护", children: [] },
        { id: "tradition", label: "传统文化", children: [] },
        { id: "finance", label: "理财规划", children: [] },
        { id: "law", label: "法务常识", children: [] },
        { id: "garden", label: "农林园艺", children: [] },
      ],
    },
  ];

  const aliases = {
    fitness: { domain: "body", sub: "training" },
  };

  function copyText(key, fallback) {
    const copy = typeof window !== "undefined" ? window.HuashanhuCopy : null;
    return copy ? copy.text(key, fallback) : fallback;
  }

  function projectKey(id) {
    return "community.tax.project." + id;
  }

  function subKey(domain, sub) {
    return "community.tax.sub." + domain + "." + sub;
  }

  function projectById(id) {
    for (let i = 0; i < sides.length; i += 1) {
      const found = sides[i].projects.find((item) => item.id === id);
      if (found) return { project: found, side: sides[i] };
    }
    return null;
  }

  function project(id) {
    const found = projectById(id);
    return found ? found.project : null;
  }

  function sideOf(id) {
    const found = projectById(id);
    return found ? found.side : null;
  }

  function childOf(domain, sub) {
    const found = project(domain);
    if (!found || !sub) return null;
    return found.children.find((item) => item.id === sub) || null;
  }

  function alias(domain) {
    return Object.prototype.hasOwnProperty.call(aliases, domain) ? aliases[domain] : null;
  }

  function canonicalize(domain, sub) {
    const mapped = alias(domain);
    if (mapped) return { known: true, domain: mapped.domain, sub: mapped.sub, aliased: true };
    const found = project(domain);
    if (!found) return { known: false, domain: domain || "", sub: sub || "" };
    if (sub && childOf(found.id, sub)) return { known: true, domain: found.id, sub: sub };
    return { known: true, domain: found.id, sub: "" };
  }

  function placement(domain, sub) {
    const found = project(domain);
    if (!found) return null;
    if (found.children.length) {
      const child = childOf(found.id, sub);
      if (!child) return null;
      return { domain: found.id, sub: child.id };
    }
    if (sub) return null;
    return { domain: found.id, sub: "" };
  }

  function label(domain, sub) {
    const canon = canonicalize(domain, sub);
    if (!canon.known) return "未归入现有项目";
    const found = project(canon.domain);
    const projectLabel = copyText(projectKey(found.id), found.label);
    const child = childOf(canon.domain, canon.sub);
    if (!child) return projectLabel;
    return projectLabel + " / " + copyText(subKey(found.id, child.id), child.label);
  }

  function href(domain, sub, side) {
    const params = new URLSearchParams();
    let hash = "";
    if (domain) {
      params.set("domain", domain);
      hash = "#domain-" + domain;
      if (sub) {
        params.set("sub", sub);
        hash = "#sub-" + domain + "-" + sub;
      }
    } else if (side) {
      params.set("side", side);
      hash = "#side-" + side;
    }
    const qs = params.toString();
    return "community.html" + (qs ? "?" + qs : "") + hash;
  }

  function selectStored(select, domain, sub) {
    select.querySelectorAll("[data-legacy]").forEach((option) => option.remove());
    const canon = canonicalize(domain, sub);
    if (!domain) {
      select.value = "";
      return { domain: "", sub: "" };
    }
    if (!canon.known) {
      const option = document.createElement("option");
      option.value = domain;
      option.setAttribute("data-legacy", "");
      option.textContent = "未归入现有项目";
      select.append(option);
      select.value = domain;
      return { domain: domain, sub: sub || "", legacy: true };
    }
    select.value = canon.domain;
    return { domain: canon.domain, sub: canon.sub };
  }

  function bindDomainSelect(domainSelect, subSelect) {
    const field = subSelect.closest("[data-sub-field]");
    function apply(selectedSub) {
      const chosen = domainSelect.selectedOptions[0];
      const legacy = Boolean(chosen && chosen.hasAttribute("data-legacy"));
      const found = legacy ? null : project(domainSelect.value);
      subSelect.replaceChildren();
      if (!found || !found.children.length) {
        field.hidden = true;
        subSelect.disabled = true;
        subSelect.required = false;
        return;
      }
      field.hidden = false;
      subSelect.disabled = false;
      subSelect.required = true;
      const blank = document.createElement("option");
      blank.value = "";
      blank.setAttribute("data-copy", "community.tax.choose-sub");
      blank.textContent = copyText("community.tax.choose-sub", "选择子项目");
      subSelect.append(blank);
      found.children.forEach((child) => {
        const option = document.createElement("option");
        const key = subKey(found.id, child.id);
        option.value = child.id;
        option.setAttribute("data-copy", key);
        option.textContent = copyText(key, child.label);
        subSelect.append(option);
      });
      subSelect.value = found.children.some((child) => child.id === selectedSub) ? selectedSub : "";
    }
    function syncGroups() {
      const groups = domainSelect.querySelectorAll("optgroup");
      const tech = document.querySelector("[data-copy='community.tax.side.tech']");
      const experience = document.querySelector("[data-copy='community.tax.side.experience']");
      if (groups[0] && tech) groups[0].label = tech.textContent;
      if (groups[1] && experience) groups[1].label = experience.textContent;
    }
    domainSelect.addEventListener("change", () => apply(""));
    document.addEventListener("huashanhu-copy", () => {
      syncGroups();
      apply(subSelect.value);
    });
    syncGroups();
    apply(subSelect.value);
    return {
      apply: apply,
      read: function () {
        return {
          domain: domainSelect.value,
          sub: subSelect.disabled ? "" : subSelect.value,
          legacy: Boolean(domainSelect.selectedOptions[0] && domainSelect.selectedOptions[0].hasAttribute("data-legacy")),
        };
      },
    };
  }

  return {
    sides: sides,
    aliases: aliases,
    project: project,
    sideOf: sideOf,
    childOf: childOf,
    alias: alias,
    canonicalize: canonicalize,
    placement: placement,
    label: label,
    href: href,
    selectStored: selectStored,
    bindDomainSelect: bindDomainSelect,
  };
});
