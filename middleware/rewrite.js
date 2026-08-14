/**
 * Safely rewrite absolute LMS/app URLs inside text responses.
 * CDN asset URLs are left alone so the browser loads CSS/JS from the real CDN.
 * NEVER touches gzip/br/deflate bodies.
 */
const config = require("../config");
const { rewriteUrl } = require("../proxy");

// Only rewrite app hosts – CDN hosts are intentionally excluded
const HOST_RE = new RegExp(
  "(https?:)?\\/\\/(?:" +
    config.managedHosts.map((h) => h.replace(/\./g, "\\.")).join("|") +
    ")",
  "gi"
);

// Also catch IdP hosts so we can send them to /login
const IDP_RE = new RegExp(
  "(https?:)?\\/\\/(?:" +
    config.idpHosts.map((h) => h.replace(/\./g, "\\.")).join("|") +
    ")",
  "gi"
);

function rewriteBody(text) {
  if (!text) return text;

  // Remove <base href="https://lms.fcps.edu/..."> which breaks relative assets
  text = text.replace(
    /<base\s+[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi,
    "<!-- base removed by local proxy -->"
  );

  // IdP → local login
  text = text.replace(IDP_RE, (match) => {
    try {
      const full = match.startsWith("//") ? "https:" + match : match;
      return rewriteUrl(full);
    } catch {
      return match;
    }
  });

  // App hosts → relative same-origin paths
  text = text.replace(HOST_RE, (match) => {
    try {
      const full = match.startsWith("//") ? "https:" + match : match;
      return rewriteUrl(full);
    } catch {
      return match;
    }
  });

  return text;
}

function rewriteMiddleware(req, res, next) {
  const chunks = [];
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);

  res.write = (chunk, enc, cb) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
    if (typeof enc === "function") enc();
    else if (typeof cb === "function") cb();
    return true;
  };

  res.end = (chunk, enc, cb) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
    const buf = Buffer.concat(chunks);

    const ctype = String(res.getHeader("content-type") || "").toLowerCase();
    const cenc = String(res.getHeader("content-encoding") || "").toLowerCase();

    const isCompressed =
      cenc.includes("gzip") ||
      cenc.includes("br") ||
      cenc.includes("deflate") ||
      cenc.includes("compress");
    const isText =
      ctype.includes("text/") ||
      ctype.includes("javascript") ||
      ctype.includes("json") ||
      ctype.includes("xml") ||
      ctype.includes("css") ||
      ctype.includes("svg");

    if (!isCompressed && isText && buf.length > 0 && buf.length < 12 * 1024 * 1024) {
      try {
        const out = Buffer.from(rewriteBody(buf.toString("utf8")), "utf8");
        res.setHeader("content-length", out.length);
        res.removeHeader("content-encoding");
        origEnd(out, undefined, cb);
        return;
      } catch (_) {
        /* fall through */
      }
    }

    for (const c of chunks) origWrite(c);
    origEnd(undefined, undefined, cb);
  };

  next();
}

module.exports = { rewriteMiddleware, rewriteBody };
