# Railway-ready: Node 22 + Python 3.11 + Playwright Chromium
FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    HOST=0.0.0.0 \
    NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Node 22 + build tools Playwright needs
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# JS deps (cached layer)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Python + Playwright browser
RUN pip install --no-cache-dir playwright requests beautifulsoup4 \
    && playwright install --with-deps chromium

# App source (includes public/site mirror)
COPY . .

# Ensure cookies dir is writable at runtime
RUN mkdir -p python && chmod 777 python

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/_local/status',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]
