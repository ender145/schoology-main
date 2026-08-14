#!/usr/bin/env python3
"""
Reusable authenticated requests.Session built from cookies.json
or by calling the Playwright login flow.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import requests

BASE = "https://lms.fcps.edu"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/150.0.0.0 Safari/537.36"
)
COOKIES_FILE = Path(__file__).resolve().parent / "cookies.json"


def load_cookies(path: Optional[Path] = None) -> list:
    p = path or COOKIES_FILE
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8"))


def make_session(cookies: Optional[list] = None) -> requests.Session:
    """Create a requests.Session with LMS cookies and headers."""
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    for c in cookies or load_cookies():
        s.cookies.set(
            c["name"],
            c["value"],
            domain=c.get("domain") or "",
            path=c.get("path") or "/",
        )
    return s


def ensure_authenticated(session: Optional[requests.Session] = None) -> requests.Session:
    """Return a session that can reach /home; re-login via auth.py if needed."""
    s = session or make_session()
    r = s.get(f"{BASE}/home", timeout=25, allow_redirects=True)
    if r is None or ("login" in r.url.lower() and "/home" not in r.url):
        from auth import login_and_get_cookies

        print("[session] Not authenticated – running Playwright login …")
        cookies = login_and_get_cookies()
        COOKIES_FILE.write_text(
            json.dumps(
                [
                    {
                        "name": c["name"],
                        "value": c["value"],
                        "domain": c.get("domain"),
                        "path": c.get("path"),
                    }
                    for c in cookies
                ],
                indent=2,
            ),
            encoding="utf-8",
        )
        s = make_session(cookies)
    return s


if __name__ == "__main__":
    s = ensure_authenticated()
    r = s.get(f"{BASE}/home")
    print(f"Status: {r.status_code}  URL: {r.url[:80]}")
