const crypto = require("crypto");
const cloudbase = require("@cloudbase/node-sdk");

const ENV_ID = process.env.TCB_ENV || "huashanhu-d8gc6g7x681612ecd";
const ISSUER = process.env.AUTH_ISSUER || "https://ejfpg9ktqybn-demo.authing.cn/oidc";
const CLIENT_ID = process.env.AUTH_CLIENT_ID || "6b07db1fdfcdc5f6f550ee56";
const JWKS_URL = ISSUER + "/.well-known/jwks.json";
const ALLOWED_ORIGINS = new Set([
  "https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com",
  "https://benben3737.github.io",
]);

let jwksCache = { at: 0, keys: [] };
let app;

function credentials() {
  if (!process.env.CUSTOM_LOGIN_CREDENTIALS) return null;
  return JSON.parse(process.env.CUSTOM_LOGIN_CREDENTIALS);
}

function getApp() {
  if (app) return app;
  const creds = credentials();
  app = cloudbase.init(creds ? { env: ENV_ID, credentials: creds } : { env: ENV_ID });
  return app;
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://huashanhu-d8gc6g7x681612ecd-1542175561.tcloudbaseapp.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function http(status, payload, origin) {
  return { statusCode: status, headers: corsHeaders(origin), body: JSON.stringify(payload) };
}

function text(value, max) {
  const clean = typeof value === "string" ? value.trim() : "";
  return clean.slice(0, max);
}

function tcbUid(sub) {
  const raw = String(sub || "");
  const safe = raw.replace(/[^A-Za-z0-9_#@().:-]/g, "");
  if (safe.length >= 4 && safe.length <= 32) return safe;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

async function jwks() {
  if (Date.now() - jwksCache.at < 10 * 60 * 1000 && jwksCache.keys.length) return jwksCache.keys;
  const response = await fetch(JWKS_URL);
  if (!response.ok) throw new Error("jwks");
  const body = await response.json();
  jwksCache = { at: Date.now(), keys: body.keys || [] };
  return jwksCache.keys;
}

async function verifyIdToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("shape");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  if (header.alg !== "RS256" || !header.kid) throw new Error("alg");
  const jwk = (await jwks()).find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw new Error("kid");
  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const valid = crypto.verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), key, Buffer.from(parts[2], "base64url"));
  if (!valid) throw new Error("signature");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== ISSUER || !audience.includes(CLIENT_ID)) throw new Error("claim");
  if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error("exp");
  // Invite-only admin-created accounts on the Authing free plan cannot be marked
  // email_verified without 实名, so a valid signature, issuer, audience, expiry,
  // and sub are enough. Do not treat this as a public signup check.
  if (!payload.sub) throw new Error("sub");
  return payload;
}

const FOUNDER_SUBS = new Set(
  String(process.env.FOUNDER_USER_IDS || "6b0812111816a7d37dca6950")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);

function isFounder(payload) {
  const sub = String(payload.sub || "");
  if (FOUNDER_SUBS.has(sub)) return true;
  const external = String(payload.external_id || payload.externalId || "");
  return external === "founder";
}

function actor(payload) {
  const founder = isFounder(payload);
  return {
    authorUid: tcbUid(payload.sub),
    role: founder ? "founder" : "member",
    permissions: founder ? "all" : "standard",
  };
}

function bearer(event) {
  const headers = event.headers || {};
  const value = headers.authorization || headers.Authorization || "";
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function publicCard(doc) {
  return {
    id: doc._id,
    title: doc.title,
    summary: doc.summary,
    domain: doc.domain,
    kind: doc.kind,
    authorName: doc.authorName,
    createdAt: doc.createdAt,
  };
}

async function listCourses() {
  const db = getApp().database();
  const result = await db.collection("course_catalog").orderBy("createdAt", "desc").limit(50).get();
  return { ok: true, courses: (result.data || []).map(publicCard) };
}

async function getCourse(event) {
  const payload = await verifyIdToken(bearer(event));
  const who = actor(payload);
  const id = text(event.body.id, 80);
  if (!id) return { ok: false, code: "bad_request", message: "缺少课程编号。" };
  const db = getApp().database();
  const catalog = await db.collection("course_catalog").doc(id).get();
  const meta = (catalog.data && catalog.data[0]) || catalog.data;
  if (!meta || !meta.title) return { ok: false, code: "not_found", message: "没有这门已发布的课程。" };
  const body = await db.collection("course_bodies").where({ courseId: id }).limit(1).get();
  const full = (body.data || [])[0] || {};
  return {
    ok: true,
    course: Object.assign(publicCard(meta), {
      chapters: full.chapters || [],
      materials: full.materials || "",
      template: full.template || "",
    }),
    reader: who.authorUid,
    role: who.role,
    permissions: who.permissions,
  };
}

function cleanCourse(input) {
  const kind = ["course", "insight", "work"].includes(input.kind) ? input.kind : "";
  const title = text(input.title, 80);
  const summary = text(input.summary, 500);
  const domain = text(input.domain, 40) || "other";
  const materials = text(input.materials, 500);
  const template = text(input.template, 40);
  if (!kind || !title) return null;
  if (!Array.isArray(input.chapters) || input.chapters.length < 1 || input.chapters.length > 20) return null;
  const chapters = [];
  for (const chapter of input.chapters) {
    if (!chapter || typeof chapter.heading !== "string" || typeof chapter.body !== "string") return null;
    chapters.push({ heading: text(chapter.heading, 80), body: text(chapter.body, 8000) });
  }
  return { kind, title, summary, domain, materials, template, chapters };
}

async function publishCourse(event) {
  const payload = await verifyIdToken(bearer(event));
  const who = actor(payload);
  const course = cleanCourse(event.body.course || {});
  if (!course) return { ok: false, code: "bad_request", message: "课程内容不完整，没有写入。" };
  const uid = who.authorUid;
  const authorName = text(payload.nickname || payload.name || "", 40) || (who.role === "founder" ? "化山湖创始人" : "受邀成员");
  const db = getApp().database();
  const createdAt = new Date().toISOString();
  const added = await db.collection("course_catalog").add({
    title: course.title,
    summary: course.summary,
    domain: course.domain,
    kind: course.kind,
    authorName: authorName,
    authorUid: uid,
    authingSub: String(payload.sub),
    createdAt: createdAt,
  });
  const id = added.id || added._id;
  await db.collection("course_bodies").add({
    courseId: id,
    chapters: course.chapters,
    materials: course.materials,
    template: course.template,
    authorUid: uid,
    createdAt: createdAt,
  });
  let pointsAwarded = false;
  if (course.kind === "course") {
    const existing = await db.collection("points_ledger").where({ courseId: id }).limit(1).get();
    if (!(existing.data || []).length) {
      await db.collection("points_ledger").add({
        courseId: id,
        authorUid: uid,
        delta: 1,
        reason: "course_publish",
        createdAt: createdAt,
      });
      pointsAwarded = true;
    }
  }
  let ticket = "";
  if (credentials() && getApp().auth && typeof getApp().auth().createTicket === "function") {
    ticket = await Promise.resolve(getApp().auth().createTicket(uid));
  }
  return { ok: true, id: id, pointsAwarded: pointsAwarded, ticket: ticket, authorUid: uid, role: who.role, permissions: who.permissions };
}

async function authTicket(event) {
  const payload = await verifyIdToken(bearer(event));
  const who = actor(payload);
  if (!credentials()) {
    return { ok: false, code: "not_configured", message: "云函数还没有自定义登录私钥。没有签发 CloudBase 票据。" };
  }
  const ticket = await Promise.resolve(getApp().auth().createTicket(who.authorUid));
  return { ok: true, ticket: ticket, authorUid: who.authorUid, role: who.role, permissions: who.permissions };
}

function plainCopy(value) {
  if (typeof value !== "string") return null;
  return value.replace(/\u0000/g, "").slice(0, 4000);
}

function copyKey(value) {
  return /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value);
}

async function listCopy() {
  const db = getApp().database();
  const copies = {};
  let skip = 0;
  for (let page = 0; page < 20; page += 1) {
    const result = await db.collection("site_copy").skip(skip).limit(100).get();
    const rows = result.data || [];
    rows.forEach((doc) => {
      if (typeof doc.key === "string" && typeof doc.text === "string") copies[doc.key] = doc.text;
    });
    if (rows.length < 100) break;
    skip += rows.length;
  }
  return { ok: true, copies: copies };
}

async function saveCopy(event) {
  const payload = await verifyIdToken(bearer(event));
  const who = actor(payload);
  if (who.role !== "founder") {
    return { ok: false, code: "forbidden", message: "只有创始人可以保存网站文本。" };
  }
  const copies = event.body.copies;
  if (!copies || typeof copies !== "object" || Array.isArray(copies)) {
    return { ok: false, code: "bad_request", message: "没有可保存的文本。" };
  }
  const keys = Object.keys(copies);
  if (!keys.length || keys.length > 80) return { ok: false, code: "bad_request", message: "这次保存的条目数量不合适。没有写入。" };
  const db = getApp().database();
  const saved = [];
  for (const key of keys) {
    if (!copyKey(key)) return { ok: false, code: "bad_request", message: "文本编号不合法。没有写入。" };
    const text = plainCopy(copies[key]);
    if (text === null) return { ok: false, code: "bad_request", message: "网站文本只能是纯文字。没有写入。" };
    const existing = await db.collection("site_copy").where({ key: key }).limit(1).get();
    const row = (existing.data || [])[0];
    const id = row && (row._id || row.id);
    const record = { key: key, text: text, updatedAt: new Date().toISOString(), updatedBy: who.authorUid };
    if (id) await db.collection("site_copy").doc(id).update(record);
    else await db.collection("site_copy").add(record);
    saved.push(key);
  }
  return { ok: true, saved: saved };
}

async function whoami(event) {
  const payload = await verifyIdToken(bearer(event));
  const who = actor(payload);
  return { ok: true, role: who.role, permissions: who.permissions };
}

async function listPoints(event) {
  const payload = await verifyIdToken(bearer(event));
  const who = actor(payload);
  const db = getApp().database();
  const result = await db.collection("points_ledger").where({ authorUid: who.authorUid }).limit(100).get();
  const rows = result.data || [];
  const total = rows.reduce((sum, row) => sum + (Number(row.delta) || 0), 0);
  return { ok: true, total: total, entries: rows.map((row) => ({ courseId: row.courseId, delta: row.delta, reason: row.reason, createdAt: row.createdAt })), role: who.role, permissions: who.permissions };
}

exports.main = async (event) => {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  if (event.httpMethod === "OPTIONS") return http(204, {}, origin);
  let body = event.body;
  if (typeof body === "string" && body) {
    try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body); }
    catch (error) { body = {}; }
  }
  event.body = body && typeof body === "object" ? body : {};
  const action = event.body.action || event.action || "";
  try {
    let result;
    if (action === "listCourses") result = await listCourses();
    else if (action === "getCourse") result = await getCourse(event);
    else if (action === "publishCourse") result = await publishCourse(event);
    else if (action === "authTicket") result = await authTicket(event);
    else if (action === "listPoints") result = await listPoints(event);
    else if (action === "listCopy") result = await listCopy();
    else if (action === "saveCopy") result = await saveCopy(event);
    else if (action === "whoami") result = await whoami(event);
    else result = { ok: false, code: "unknown_action", message: "没有这个操作。" };
    const status = result.ok ? 200 : result.code === "not_found" ? 404 : result.code === "forbidden" ? 403 : 400;
    return http(status, result, origin);
  } catch (error) {
    const code = error.message === "unverified" ? "unverified" : "unauthorized";
    return http(401, { ok: false, code: code, message: "身份没有通过 CloudBase 云函数核验。没有写入。" }, origin);
  }
};
