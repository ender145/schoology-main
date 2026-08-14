/**
 * Clean multi-host reverse proxy.
 * Requests uncompressed bodies (Accept-Encoding: identity) so HTML
 * rewriting never corrupts gzip streams.
 *
 * Strategy:
 *  - Proxy HTML pages + APIs through localhost (session cookies injected)
 *  - Leave CDN asset URLs (ui.schoology.com, asset-cdn, …) alone so the
 *    browser loads CSS/JS directly from the real CDN (fully styled UI)
 *  - Force IdP/SAML redirects back to local /login
 */
const { createProxyMiddleware } = require("http-proxy-middleware");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const log = {
  info: (...a) =>
    config.logRequests &&
    console.log(`[${new Date().toISOString().slice(11, 23)}]`, ...a),
  warn: (...a) => console.warn(`[${new Date().toISOString().slice(11, 23)}]`, ...a),
  error: (...a) => console.error(`[${new Date().toISOString().slice(11, 23)}]`, ...a),
};

/** Resolve the origin the browser should see (never 0.0.0.0 / 127.0.0.1). */
function getPublicOrigin(req) {
  if (config.publicUrl) return config.publicUrl.replace(/\/$/, "");
  if (req && req.headers && req.headers.host) {
    const proto =
      req.headers["x-forwarded-proto"] ||
      (req.secure ? "https" : "http");
    return `${proto}://${req.headers.host}`;
  }
  const host = config.host === "0.0.0.0" ? "127.0.0.1" : config.host;
  return `http://${host}:${config.port}`;
}

// Bootstrap cookies – re-read from disk so post-login cookies are picked up
// Optionally filter by domain relevance to the upstream target.
function getBootstrapCookies(targetHost) {
  try {
    const p = path.resolve(__dirname, config.python.cookiesFile);
    if (!fs.existsSync(p)) return "";
    const list = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!Array.isArray(list) || !list.length) return "";

    const th = (targetHost || "").toLowerCase().replace(/^\./, "");
    const relevant = list.filter((c) => {
      if (!c || !c.name) return false;
      if (!th || !c.domain) return true; // send all if we can't filter
      const d = String(c.domain).toLowerCase().replace(/^\./, "");
      // cookie domain matches target or is a parent domain
      return th === d || th.endsWith("." + d) || d.endsWith("." + th) || d.includes("schoology") || d.includes("fcps");
    });

    const use = relevant.length ? relevant : list;
    return use.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch (e) {
    return "";
  }
}

function resolveTarget(pathname) {
  const p = pathname.replace(/^\/+/, "/");
  for (const [re, target] of config.routes) {
    if (re.test(p)) return target;
  }
  return config.target;
}

function isManaged(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  return config.managedHosts.some((x) => h === x || h.endsWith("." + x));
}

function isCdn(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  return (config.cdnHosts || []).some((x) => h === x || h.endsWith("." + x));
}

/**
 * Rewrite an absolute LMS URL to our public origin.
 * CDN hosts are left untouched so CSS/JS load from the real CDN.
 * IdP hosts are forced to local /login.
 */
function rewriteUrl(raw, { keepIdp = false, origin } = {}) {
  if (!raw || typeof raw !== "string") return raw;
  let s = raw.trim();
  if (s.startsWith("//")) s = "https:" + s;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();

    // Force SAML / IdP redirects back to local login
    if (config.idpHosts.includes(host)) {
      return "/login";
    }

    // Leave CDN asset URLs alone – browser loads them directly
    if (isCdn(host)) {
      return raw.startsWith("//") ? "https:" + raw.replace(/^\/\//, "//") : (raw.startsWith("http") ? raw : "https://" + host + u.pathname + u.search + u.hash);
    }

    if (!isManaged(host)) return raw;

    // App hosts → same-origin relative path
    return u.pathname + u.search + u.hash;
  } catch {
    return raw;
  }
}

function createProxy() {
  return createProxyMiddleware({
    router(req) {
      // Normalise //host/path or //path
      if (req.url && req.url.startsWith("//")) {
        try {
          const u = new URL("https:" + req.url);
          if (isManaged(u.hostname) || isCdn(u.hostname)) {
            req.url = u.pathname + u.search;
          } else {
            req.url = "/" + req.url.replace(/^\/+/, "");
          }
        } catch {
          req.url = "/" + req.url.replace(/^\/+/, "");
        }
      }
      const pathOnly = (req.url || "/").split("?")[0].replace(/^\/+/, "/");
      req._target = resolveTarget(pathOnly);
      return req._target;
    },
    target: config.target,
    changeOrigin: true,
    secure: true,
    ws: true,
    xfwd: true,
    followRedirects: false,
    cookieDomainRewrite: config.cookieDomainRewrite,
    cookiePathRewrite: "/",
    pathRewrite: (p) => p.replace(/^\/+/, "/"),

    on: {
      proxyReq(proxyReq, req) {
        req._t0 = Date.now();
        const target = req._target || config.target;
        let targetHost = "";
        try {
          targetHost = new URL(target).host;
          proxyReq.setHeader("Host", targetHost);
        } catch (_) {}

        // Force uncompressed responses so rewrite middleware can safely edit HTML
        proxyReq.setHeader("Accept-Encoding", "identity");

        let cookie = req.headers.cookie || "";
        const bootstrap = getBootstrapCookies(targetHost);
        if (bootstrap) cookie = cookie ? cookie + "; " + bootstrap : bootstrap;
        if (cookie) proxyReq.setHeader("Cookie", cookie);

        proxyReq.setHeader(
          "User-Agent",
          req.headers["user-agent"] ||
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
        proxyReq.setHeader("Accept-Language", "en-US,en;q=0.9");
        // Referer helps some CDNs / app logic
        proxyReq.setHeader("Referer", target.replace(/\/$/, "") + "/");
        proxyReq.removeHeader("connection");

        log.info(`→ ${req.method} ${req.originalUrl || req.url}  ⇒  ${target}${req.url}`);
      },

      proxyRes(proxyRes, req) {
        const ms = Date.now() - (req._t0 || Date.now());
        const code = proxyRes.statusCode;
        const origin = getPublicOrigin(req);
        const isHttps = origin.startsWith("https");

        if (proxyRes.headers.location) {
          const loc = proxyRes.headers.location;
          // Detect real IdP/SAML redirects – session is dead, clear cookies
          try {
            const u = new URL(loc.startsWith("//") ? "https:" + loc : loc, "https://lms.fcps.edu");
            if (config.idpHosts.includes(u.hostname.toLowerCase())) {
              try {
                const cookiePath = path.resolve(__dirname, config.python.cookiesFile);
                if (fs.existsSync(cookiePath)) {
                  fs.unlinkSync(cookiePath);
                  log.warn("cleared expired cookies (IdP redirect detected)");
                }
              } catch (_) {}
            }
          } catch (_) {}

          proxyRes.headers.location = rewriteUrl(loc, {
            keepIdp: true,
            origin,
          });
        }

        if (proxyRes.headers["set-cookie"]) {
          const list = [].concat(proxyRes.headers["set-cookie"]);
          proxyRes.headers["set-cookie"] = list.map((c) => {
            let out = c
              .replace(/;?\s*Domain=[^;]*/gi, "")
              .replace(/; *SameSite=None/gi, "; SameSite=Lax");
            if (isHttps) {
              if (!/; *Secure/i.test(out)) out += "; Secure";
            } else {
              out = out.replace(/; *Secure/gi, "");
            }
            return out;
          });
        }

        // Allow local embedding / scripting; prevent CDN blocks
        delete proxyRes.headers["content-security-policy"];
        delete proxyRes.headers["content-security-policy-report-only"];
        delete proxyRes.headers["x-frame-options"];

        const color =
          code >= 500 ? "\x1b[31m" : code >= 400 ? "\x1b[33m" : code >= 300 ? "\x1b[36m" : "\x1b[32m";
        log.info(`← ${color}${code}\x1b[0m ${req.method} ${req.originalUrl || req.url}  (${ms}ms)`);
      },

      error(err, req, res) {
        log.error(`proxy error ${req.url}: ${err.message}`);
        if (res && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Bad Gateway: " + err.message);
        }
      },
    },
  });
}

module.exports = {
  createProxy,
  rewriteUrl,
  resolveTarget,
  log,
  isManaged,
  isCdn,
  getPublicOrigin,
};
