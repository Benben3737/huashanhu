"use strict";

// Ids must match assets/js/taxonomy.js. scripts/check-taxonomy.js compares them.
const tree = {
  music: [],
  art: ["painting", "design"],
  body: ["training", "rehab", "martial", "combat"],
  mind: [],
  medicine: [],
  esoteric: [],
  philosophy: ["marxism", "aesthetics"],
  travel: [],
  cooking: [],
  digital: ["programming"],
  media: ["equipment"],
  craft: [],
  language: [],
  business: ["social"],
  care: [],
  tradition: [],
  finance: [],
  law: [],
  garden: [],
};

function placement(domain, sub) {
  if (!Object.prototype.hasOwnProperty.call(tree, domain)) return null;
  const children = tree[domain];
  if (children.length) {
    if (children.indexOf(sub) === -1) return null;
    return { domain: domain, sub: sub };
  }
  if (sub) return null;
  return { domain: domain, sub: "" };
}

module.exports = { tree: tree, placement: placement };
