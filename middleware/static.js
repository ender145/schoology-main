/**
 * Serve files from the site.zip mirror when present.
 * public/site/<hostname>/<path>
 *
 * Prefer LIVE backend for HTML app shells and for JS/CSS so a stale
 * mirror cannot break the modern Schoology UI.
 */
const path = require("path");
const fs = require("fs");
const config = require("../config");

const PUBLIC = path.resolve(__dirname, "..", config.publicDir);

// Dynamic API / page paths – always hit the live backend
const LIVE = [
  /^\/$/,
  /^\/home/,
  /^\/api/,
  /^\/iapi/,
  /^\/v1\//,
  /^\/ajax/,
  /^\/update_post/,
  /^\/messages/,
  /^\/mailbox/,
  /^\/grades/,
  /^\/notifications/,
  /^\/login/,
  /^\/logout/,
  /^\/saml/,
  /^\/sso/,
  /^\/am(\/|$)/,
  /^\/openidm/,
  /^\/courses/,
  /^\/course\//,
  /^\/group/,
  /^\/user/,
  /^\/calendar/,
  /^\/section\//,
  /^\/assignment/,
  /^\/platform\//i,       // modern UI bundles – always live
  /^\/design-system\//i,
];

// Never serve these extensions from the local mirror (stale copies break the SPA)
const LIVE_EXT = /\.(js|mjs|css|map|json)(\?|$)/i;

function safe(...parts) {
  const t = path.normalize(path.join(PUBLIC, ...parts));
  return t.startsWith(PUBLIC) ? t : null;
}

function resolve(req) {
  let p = (req.path || req.url || "/").split("?")[0].replace(/^\/+/, "/");
  const rel = p.replace(/^\//, "");

  const hosts = [];
  if (/^platform\//i.test(rel) || /^design-system\//i.test(rel)) hosts.push("ui.schoology.com");
  if (/^assets\//i.test(rel) || /^sites\//i.test(rel)) hosts.push("asset-cdn.schoology.com");
  hosts.push(
    "lms.fcps.edu",
    "ui.schoology.com",
    "asset-cdn.schoology.com",
    "files-cdn.schoology.com",
    "app.schoology.com"
  );

  const candidates = [];
  for (const h of hosts) candidates.push(safe(h, rel));
  candidates.push(safe(rel));
  for (const c of [...candidates]) {
    if (c && !path.extname(c)) {
      candidates.push(c + ".html");
      candidates.push(path.join(c, "index.html"));
    }
  }

  for (const f of candidates) {
    if (!f) continue;
    try {
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    } catch (_) {}
  }
  return null;
}

function localStatic(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const p = (req.path || "/").replace(/^\/+/, "/");
  if (LIVE.some((re) => re.test(p))) return next();
  if (LIVE_EXT.test(p)) return next(); // always fetch modern JS/CSS live

  const file = resolve(req);
  if (!file) return next();

  res.sendFile(file, (err) => {
    if (err) next();
  });
}

module.exports = { localStatic };
