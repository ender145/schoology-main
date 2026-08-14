module.exports = {
  target: "https://lms.fcps.edu",
  // Railway / production: always bind 0.0.0.0 and use $PORT
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || "0.0.0.0",

  // Public origin the browser sees (set on Railway as PUBLIC_URL)
  // e.g. https://project-repo-production.up.railway.app
  // Falls back to request host at runtime when possible.
  publicUrl: process.env.PUBLIC_URL || process.env.RAILWAY_PUBLIC_URL || "",

  logRequests: true,
  logLevel: "info",
  publicDir: "public/site",

  // Path prefix → upstream origin (first match wins)
  routes: [
    [/^\/am(\/|$)/i, "https://aic.fcps.edu"],
    [/^\/openidm(\/|$)/i, "https://aic.fcps.edu"],
    [/^\/sso(\/|$)/i, "https://sso.fcps.edu"],
    [/^\/platform\//i, "https://ui.schoology.com"],
    [/^\/design-system\//i, "https://ui.schoology.com"],
    [/^\/assets\//i, "https://asset-cdn.schoology.com"],
    [/^\/sites\//i, "https://asset-cdn.schoology.com"],
    [/.*/, "https://lms.fcps.edu"],
  ],

  // Hosts whose absolute URLs we rewrite to our public origin in HTML/CSS/JS
  // NOTE: CDN hosts are intentionally excluded – browser loads CSS/JS directly
  // from the real CDN so the modern UI actually styles and boots.
  managedHosts: [
    "lms.fcps.edu",
    "app.schoology.com",
    "www.fcps.edu",
  ],

  // Static asset CDNs – never rewrite these; let the browser hit them directly
  cdnHosts: [
    "ui.schoology.com",
    "asset-cdn.schoology.com",
    "files-cdn.schoology.com",
  ],

  // Never rewrite these query keys (SAML signatures)
  samlKeys: ["samlrequest", "samlresponse", "relaystate", "sigalg", "signature"],

  // IdP hosts – force back to local /login
  idpHosts: ["aic.fcps.edu", "sso.fcps.edu"],

  // Remove Domain attribute so cookies bind to whatever host the user is on
  cookieDomainRewrite: false,

  python: {
    authScript: "python/auth.py",
    cookiesFile: "python/cookies.json",
  },
};
