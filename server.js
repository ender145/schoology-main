#!/usr/bin/env node
/**
 * Local LMS Clone
 *  1. Login form → Playwright auth with user credentials
 *  2. Proxy the real Schoology UI (default at /home)
 *  3. Optional scraped data view at /data
 */
const express = require("express");
const compression = require("compression");
const path = require("path");
const http = require("http");
const fs = require("fs");
const { spawnSync } = require("child_process");
const config = require("./config");

const ROOT = __dirname;
const COOKIES = path.resolve(ROOT, config.python.cookiesFile);
const AUTH = path.resolve(ROOT, config.python.authScript);
const SCRAPE = path.resolve(ROOT, "python/scrape_home.py");

// ── helpers ────────────────────────────────────────────────────
function hasCookies() {
  try {
    if (!fs.existsSync(COOKIES)) return false;
    const data = JSON.parse(fs.readFileSync(COOKIES, "utf8"));
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

function pyBin() {
  return process.platform === "win32" ? "python" : "python3";
}

function runAuth(username, password) {
  const r = spawnSync(
    pyBin(),
    [AUTH, "--user", username, "--pass", password],
    { cwd: path.dirname(AUTH), stdio: "inherit", env: process.env, timeout: 300000 }
  );
  return r.status === 0 && hasCookies();
}

function scrapeHome() {
  const r = spawnSync(pyBin(), [SCRAPE], {
    cwd: path.dirname(SCRAPE),
    encoding: "utf8",
    timeout: 120000,
    env: process.env,
  });
  if (r.error || r.status !== 0) {
    return { ok: false, error: (r.stderr || r.error || "scrape failed").toString() };
  }
  try {
    return JSON.parse(r.stdout || "{}");
  } catch (e) {
    return { ok: false, error: "bad scrape JSON: " + e.message, raw: (r.stdout || "").slice(0, 500) };
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── pages ──────────────────────────────────────────────────────
function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FCPS LMS – Local Login</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:40px;width:100%;max-width:400px}
  h1{font-size:1.4rem;margin-bottom:6px;color:#1a1a2e}
  p.sub{color:#666;font-size:.9rem;margin-bottom:28px}
  label{display:block;font-size:.85rem;font-weight:600;margin-bottom:6px;color:#333}
  input{width:100%;padding:12px 14px;border:1px solid #d0d5dd;border-radius:8px;font-size:1rem;margin-bottom:18px}
  input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
  button{width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer}
  button:hover{background:#1d4ed8}
  button:disabled{opacity:.6;cursor:wait}
  .err{background:#fef2f2;color:#b91c1c;padding:10px 14px;border-radius:8px;margin-bottom:18px;font-size:.9rem}
  .note{margin-top:20px;font-size:.8rem;color:#888;line-height:1.4}
</style>
</head>
<body>
<div class="card">
  <h1>FCPS Schoology</h1>
  <p class="sub">Local clone – sign in with your real credentials</p>
  ${error ? `<div class="err">${escapeHtml(error)}</div>` : ""}
  <form method="POST" action="/login" id="f">
    <label for="user">Student ID / Username</label>
    <input id="user" name="username" required autocomplete="username" autofocus/>
    <label for="pass">Password</label>
    <input id="pass" name="password" type="password" required autocomplete="current-password"/>
    <button type="submit" id="btn">Log in</button>
  </form>
  <p class="note">A Chromium window will open for FCPS SSO. Complete login there if prompted. Your password is only sent to the real FCPS servers via Playwright.</p>
</div>
<script>
document.getElementById('f').addEventListener('submit', function() {
  var b = document.getElementById('btn');
  b.disabled = true;
  b.textContent = 'Signing in… (Chromium will open)';
});
</script>
</body>
</html>`;
}

function homePage(data) {
  const name = escapeHtml(data.profile?.name || "Student");
  const feed = (data.feed || [])
    .map(
      (u) => `
    <article class="post">
      <div class="meta">
        <strong>${escapeHtml(u.author)}</strong>
        <span class="when">${escapeHtml(u.datetime)}</span>
      </div>
      <div class="body">${escapeHtml(u.message).replace(/\n/g, "<br/>")}</div>
    </article>`
    )
    .join("") || `<p class="empty">No recent activity found.</p>`;

  const courses = (data.courses || [])
    .map(
      (c) =>
        `<li><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.name)}</a></li>`
    )
    .join("") || "<li class='empty'>No courses found</li>";

  const groups = (data.groups || [])
    .map(
      (g) =>
        `<li><a href="${escapeHtml(g.url)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a></li>`
    )
    .join("") || "<li class='empty'>No groups found</li>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Home | Local LMS</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#eef1f5;color:#1a1a2e}
  header{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
  header .brand{font-weight:700;font-size:1.1rem;color:#0f4c81}
  header .user{font-size:.9rem;color:#555}
  header a.logout{color:#2563eb;text-decoration:none;font-size:.85rem;margin-left:16px}
  .layout{max-width:1100px;margin:24px auto;padding:0 16px;display:grid;grid-template-columns:1fr 300px;gap:20px}
  @media(max-width:800px){.layout{grid-template-columns:1fr}}
  .card{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.06);padding:20px}
  h2{font-size:1rem;margin-bottom:14px;color:#334155;border-bottom:1px solid #eee;padding-bottom:8px}
  .post{padding:14px 0;border-bottom:1px solid #f1f5f9}
  .post:last-child{border-bottom:none}
  .meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;font-size:.85rem}
  .when{color:#94a3b8}
  .body{font-size:.95rem;line-height:1.5;white-space:pre-wrap}
  .side ul{list-style:none}
  .side li{padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:.9rem}
  .side a{color:#2563eb;text-decoration:none}
  .side a:hover{text-decoration:underline}
  .empty{color:#94a3b8;font-size:.9rem}
  .banner{background:#ecfdf5;color:#065f46;padding:10px 24px;font-size:.85rem;border-bottom:1px solid #a7f3d0}
  .actions{margin-top:12px}
  .actions a,.actions button{font-size:.85rem;margin-right:12px;color:#2563eb;background:none;border:none;cursor:pointer;text-decoration:none}
</style>
</head>
<body>
<header>
  <div class="brand">FCPS · Local LMS</div>
  <div>
    <span class="user">${name}</span>
    <a class="logout" href="/logout">Log out</a>
  </div>
</header>
<div class="banner">
  Scraped data view (lightweight).
  <a href="/home" style="margin-left:12px">Open full LMS UI</a>
</div>
<div class="layout">
  <main class="card">
    <h2>Recent Activity <span style="font-weight:400;color:#94a3b8">(${(data.feed||[]).length})</span></h2>
    ${feed}
    <div class="actions">
      <form method="POST" action="/refresh" style="display:inline"><button type="submit">Refresh data</button></form>
    </div>
  </main>
  <aside>
    <div class="card side" style="margin-bottom:16px">
      <h2>Courses</h2>
      <ul>${courses}</ul>
    </div>
    <div class="card side">
      <h2>Groups</h2>
      <ul>${groups}</ul>
    </div>
  </aside>
</div>
</body>
</html>`;
}

// ── app ────────────────────────────────────────────────────────
const app = express();
// Railway (and most PaaS) terminate TLS and set X-Forwarded-* headers
app.set("trust proxy", 1);
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Require login for app pages
function requireAuth(req, res, next) {
  if (hasCookies()) return next();
  return res.redirect("/login");
}

app.get("/", (req, res) => {
  if (hasCookies()) return res.redirect("/home");
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (hasCookies()) return res.redirect("/home");
  res.type("html").send(loginPage());
});

app.post("/login", (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";
  if (!username || !password) {
    return res.type("html").send(loginPage("Username and password are required."));
  }

  console.log(`\n[login] Authenticating as ${username} …`);
  const ok = runAuth(username, password);
  if (!ok) {
    return res.type("html").send(
      loginPage("Login failed. Check credentials and try again. Complete SSO in the Chromium window if it opened.")
    );
  }

  console.log("[login] Auth OK – opening LMS …");
  res.redirect("/home");
});

// Lightweight scraped data view (optional)
app.get("/data", requireAuth, (req, res) => {
  console.log("[data] Scraping live data …");
  const data = scrapeHome();
  if (!data.ok) {
    if (/not authenticated|no cookies/i.test(data.error || "")) {
      try { fs.unlinkSync(COOKIES); } catch (_) {}
      return res.redirect("/login");
    }
    return res
      .status(500)
      .type("html")
      .send(loginPage("Scrape error: " + (data.error || "unknown")));
  }
  res.type("html").send(homePage(data));
});

app.post("/refresh", requireAuth, (req, res) => res.redirect("/data"));

app.get("/logout", (req, res) => {
  try { fs.unlinkSync(COOKIES); } catch (_) {}
  res.redirect("/login");
});

app.get("/_local/status", (req, res) => {
  res.json({ ok: true, cookies: hasCookies(), port: config.port });
});

// Proxied original UI
const { createProxy, rewriteUrl, getPublicOrigin } = require("./proxy");
const { rewriteMiddleware } = require("./middleware/rewrite");
const { localStatic } = require("./middleware/static");

// Paths that must never be proxied unauthenticated (they trigger SAML)
const PROTECTED = [
  /^\/home/i,
  /^\/courses/i,
  /^\/course\//i,
  /^\/group/i,
  /^\/user/i,
  /^\/grades/i,
  /^\/messages/i,
  /^\/mailbox/i,
  /^\/notifications/i,
  /^\/calendar/i,
  /^\/assignment/i,
  /^\/section\//i,
  /^\/api/i,
  /^\/iapi/i,
];

// Optional /proxy/* alias (strips prefix) – kept for compatibility
app.use("/proxy", (req, res, next) => {
  if (!hasCookies()) return res.redirect("/login");
  req.url = req.url.replace(/^\/proxy/, "") || "/";
  next();
}, rewriteMiddleware, localStatic, createProxy());

// Guard: any protected path without cookies → local login
app.use((req, res, next) => {
  if (!hasCookies() && PROTECTED.some((re) => re.test(req.path))) {
    return res.redirect("/login");
  }
  next();
});

// Main proxy at root: /home, /courses, /platform, /assets, APIs, etc.
app.use(rewriteMiddleware);
app.use(localStatic);
app.use(createProxy());

const server = http.createServer(app);
server.listen(config.port, config.host, () => {
  const publicUrl = config.publicUrl || `http://${config.host === "0.0.0.0" ? "127.0.0.1" : config.host}:${config.port}`;
  console.log("");
  console.log("══════════════════════════════════════════════════════");
  console.log("  Local LMS Clone");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  Listening on ${config.host}:${config.port}`);
  console.log(`  Public   ${publicUrl}`);
  console.log(`  Login    ${publicUrl}/login`);
  console.log(`  App      ${publicUrl}/home          (full LMS UI)`);
  console.log(`  Data     ${publicUrl}/data          (scraped view)`);
  console.log(`  Auth     ${hasCookies() ? "cookies present" : "login required"}`);
  console.log("══════════════════════════════════════════════════════");
  console.log("");
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
