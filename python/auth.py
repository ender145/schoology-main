#!/usr/bin/env python3
"""Playwright login → cookies.json

Works headless on Railway and locally.

Usage:
  python auth.py --user 123 --pass secret
  LMS_USER=... LMS_PASS=... python auth.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

BASE = "https://lms.fcps.edu"
OUT = Path(__file__).resolve().parent / "cookies.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def login(username: str, password: str):
    from playwright.sync_api import sync_playwright

    # Headless by default; set LMS_HEADED=1 for local debugging
    headed = os.environ.get("LMS_HEADED", "").strip() in ("1", "true", "yes")

    print("=" * 50)
    print("LMS auth (Playwright)")
    print("=" * 50)
    print(f"  mode: {'headed' if headed else 'headless'}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=not headed,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        ctx = browser.new_context(
            user_agent=UA,
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        print("[1] Opening", BASE)
        page.goto(BASE + "/", wait_until="domcontentloaded", timeout=90000)
        print("   ", page.url[:120])

        try:
            page.wait_for_url("**/home**", timeout=10000)
            print("[✓] Already logged in")
        except Exception:
            print("[2] Waiting for login form / SSO …")
            try:
                page.wait_for_selector(
                    'input[type="password"], input[name="username"], '
                    '#username, input[name="IDToken1"]',
                    timeout=30000,
                )
                try:
                    page.fill(
                        'input[type="text"], input[name="username"], '
                        '#username, input[name="IDToken1"]',
                        username,
                        timeout=5000,
                    )
                    page.fill(
                        'input[type="password"], input[name="IDToken2"]',
                        password,
                        timeout=5000,
                    )
                    page.click(
                        'button[type="submit"], input[type="submit"], '
                        'button:has-text("Log"), button:has-text("Sign"), '
                        'button:has-text("Next")',
                        timeout=5000,
                    )
                    print("[2b] Submitted credentials")
                except Exception as e:
                    print(f"    Auto-fill partial ({e}) – finish in the window if needed")
            except Exception:
                print("    No form yet – complete SSO in the browser window")

            print("[3] Waiting for /home (up to 3 min) …")
            try:
                page.wait_for_url("**/home**", timeout=180000)
            except Exception:
                if "login" in page.url.lower() and "home" not in page.url.lower():
                    print("ERROR: still on login page:", page.url)
                    browser.close()
                    sys.exit(1)

        print("    Landed:", page.url)
        # Give late-set cookies a moment
        time.sleep(1.5)
        cookies = ctx.cookies()
        browser.close()

    data = [
        {
            "name": c["name"],
            "value": c["value"],
            "domain": c.get("domain", ""),
            "path": c.get("path", "/"),
        }
        for c in cookies
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[✓] {len(data)} cookies → {OUT}")
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default=os.environ.get("LMS_USER", ""))
    ap.add_argument("--pass", dest="password", default=os.environ.get("LMS_PASS", ""))
    args = ap.parse_args()

    user = args.user or os.environ.get("LMS_USER", "")
    password = args.password or os.environ.get("LMS_PASS", "")

    if not user or not password:
        print("ERROR: username and password required")
        print("  python auth.py --user STUDENT_ID --pass YOUR_PASSWORD")
        sys.exit(1)

    try:
        login(user, password)
    except ImportError:
        print("pip install playwright && playwright install chromium")
        sys.exit(1)


if __name__ == "__main__":
    main()
