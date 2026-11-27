"use strict";

const fs = require("fs");
const path = require("path");
const browser = require("../assets/js/taxonomy.js");
const server = require("../cloudfunctions/huashanhu-api/taxonomy.js");

const root = path.join(__dirname, "..");
let failed = 0;

function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", message);
  }
}

const browserTree = {};
browser.sides.forEach((side) => {
  side.projects.forEach((project) => {
    browserTree[project.id] = project.children.map((child) => child.id);
  });
});
assert(JSON.stringify(browserTree) === JSON.stringify(server.tree), "browser and cloud function project ids differ");

assert(browser.placement("music", "") && browser.placement("music", "").sub === "", "music needs no subproject");
assert(browser.placement("music", "listening") === null, "music rejects an unknown subproject");
assert(browser.placement("art", "") === null, "art requires a subproject");
assert(browser.placement("art", "design").sub === "design", "design is a subproject of art");
assert(browser.placement("body", "training").domain === "body", "training belongs to body");
assert(browser.placement("fitness", "") === null, "old fitness id is not a publishable project");
assert(server.placement("cooking", "").domain === "cooking", "server accepts cooking");
assert(server.placement("philosophy", "marxism").sub === "marxism", "server accepts 马哲等");
assert(browser.alias("fitness").sub === "training", "fitness opens 运动健身训练");
assert(browser.label("fitness") === "身体修习 / 运动健身训练", "fitness label");
assert(browser.label("travel") === "旅行", "travel label");
assert(browser.label("cooking") === "烹饪饮食", "cooking label");
assert(browser.label("other") === "未归入现有项目", "retired other bucket");

const copyKey = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const htmlNames = ["community.html", "notes.html", "index.html"];
htmlNames.forEach((name) => {
  const html = fs.readFileSync(path.join(root, name), "utf8");
  const keys = html.match(/data-copy="([^"]+)"/g) || [];
  keys.forEach((raw) => {
    const key = raw.slice('data-copy="'.length, -1);
    assert(copyKey.test(key), name + " copy key " + key);
  });
});

const community = fs.readFileSync(path.join(root, "community.html"), "utf8");
browser.sides.forEach((side) => {
  assert(community.includes('data-side="' + side.id + '"'), "missing side link " + side.label);
  side.projects.forEach((project) => {
    assert(community.includes('data-domain="' + project.id + '"'), "missing project link " + project.label);
    assert(community.includes('value="' + project.id + '"'), "missing project option " + project.label);
    project.children.forEach((child) => {
      assert(community.includes('data-sub="' + child.id + '"'), "missing subproject link " + project.label + " / " + child.label);
    });
  });
});
assert(!community.includes('data-set-domain="fitness"'), "flat fitness chip remains");
assert(!community.includes(">其他</option>"), "retired 其他 option remains");
assert(community.includes("这里还没有内容。"), "empty entry copy");
assert(community.includes("四拍听记页样例"), "music example remains");
assert(community.includes("山湖标志"), "mark example remains");
assert(community.includes('data-domain="art" data-sub="design"'), "mark sits under design");
assert(community.includes('data-domain="body" data-sub="martial"'), "mantis example sits under martial");

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(index.includes("进入技术侧"), "homepage tech entry");
assert(index.includes("进入经验侧"), "homepage experience entry");
assert(!index.includes("运动健身"), "homepage no longer lists the old fitness group");
assert(index.includes('data-copy="index.02"'), "hero copy key remains");
assert(index.includes('data-copy="index.08"'), "在这里 card remains");
assert(index.includes('data-copy="index.27"'), "现在能做什么 remains");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("taxonomy checks passed");
