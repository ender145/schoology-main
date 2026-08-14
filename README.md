# FCPS Schoology – Local / Railway Proxy

Transparent reverse proxy for Fairfax County Public Schools Schoology (`lms.fcps.edu`).

- Login via Playwright (headless) with your real FCPS credentials  
- Session cookies injected into proxied requests  
- Modern CSS/JS load from Schoology CDNs (styled UI)  
- App pages & APIs stay on your origin (localhost or Railway)

---

## Deploy on Railway (from GitHub)

### 1. Push this repo to GitHub

```bash
git init
git add .
git commit -m "FCPS LMS proxy"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

> Do **not** commit `python/cookies.json` (already in `.gitignore`).

### 2. Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select this repository  
3. Railway will detect the `Dockerfile` and build automatically

### 3. Set variables (Railway → your service → Variables)

| Variable | Value | Required |
|----------|--------|----------|
| `PUBLIC_URL` | `https://YOUR_SERVICE.up.railway.app` | Recommended |
| `HOST` | `0.0.0.0` | Already default |
| `PORT` | set by Railway | Automatic |

After the first deploy, copy the public URL Railway gives you and set `PUBLIC_URL` to it, then redeploy once.

### 4. Use it

1. Open `https://YOUR_SERVICE.up.railway.app/login`
2. Enter your FCPS Student ID / password  
3. Wait ~30–90s while the server runs headless Chromium login  
4. You’ll be redirected to `/home` (full LMS UI)

---

## Run locally

```bash
npm install
pip install playwright requests beautifulsoup4
playwright install chromium   # or: python -m playwright install chromium

node server.js
# → http://localhost:3000/login
```

---

## Routes

| Path | Description |
|------|-------------|
| `/login` | Local login form (Playwright SSO) |
| `/home` | Full proxied Schoology UI |
| `/data` | Lightweight scraped feed/courses view |
| `/logout` | Clear session cookies |
| `/_local/status` | Health check JSON |

---

## How it works

```
Browser  →  your Railway URL / localhost
              │
              ├─ CDN assets (ui.schoology.com, asset-cdn.…)
              │     loaded directly by the browser (styled UI)
              │
              └─ App pages + APIs
                    proxied to https://lms.fcps.edu
                    with session cookies injected
```

SAML / IdP redirects (`aic.fcps.edu`, `sso.fcps.edu`) are rewritten to `/login` so the browser never leaves your origin.

---

## Notes

- **Credentials** are only sent to real FCPS servers via Playwright; they are not stored.
- **Cookies** live in `python/cookies.json` inside the container (ephemeral on Railway — log in again after redeploys).
- First Railway build is large (Chromium) and can take several minutes.
- If login fails on Railway, check **Deploy Logs** for Playwright errors; FCPS SSO occasionally challenges headless browsers.

## License

MIT
