#!/usr/bin/env python3
"""
Scrape LMS home feed / courses / groups using cookies.json.
Prints JSON to stdout for the Node server.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://lms.fcps.edu"
COOKIES_FILE = Path(__file__).resolve().parent / "cookies.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

DATE_RE = re.compile(
    r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+"
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+"
    r"\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:am|pm)"
    r"|"
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+"
    r"\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:am|pm)"
    r"|"
    r"\d{1,2}/\d{1,2}/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:am|pm)?",
    re.I,
)

CHROME = {
    "comment", "like", "·", "*", "write a comment:", "comments", "likes",
    "share", "edit", "delete", "reply", "view comments", "show more",
    "see more", "add comment", "show more…", "show more...", "view",
}


def session_from_cookies():
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    if not COOKIES_FILE.exists():
        return None
    for c in json.loads(COOKIES_FILE.read_text(encoding="utf-8")):
        s.cookies.set(
            c["name"], c["value"],
            domain=c.get("domain") or "",
            path=c.get("path") or "/",
        )
    return s


def get(s, path):
    url = path if path.startswith("http") else urljoin(BASE, path)
    try:
        r = s.get(url, timeout=25, allow_redirects=True)
        if "login" in r.url.lower() and "/home" not in r.url:
            return None
        return r
    except Exception:
        return None


def parse_feed(html, page_url, context="Home"):
    soup = BeautifulSoup(html or "", "html.parser")
    nodes = soup.select(
        ".s-edge-type-update-post, .s-js-feed-item, "
        "div[data-type='update'], .feed-item, .update-item, article"
    )
    if not nodes:
        for div in soup.find_all(["div", "article", "li"]):
            txt = div.get_text(" ", strip=True)
            if DATE_RE.search(txt) and len(txt) > 40:
                nodes.append(div)

    updates, seen = [], set()
    for node in nodes:
        author_el = node.select_one(
            ".update-author, .s-js-author, .user-name, a[href*='/user/'], .author"
        )
        body_el = node.select_one(
            ".update-body, .feed-item-body, .s-js-update-body, .discussion-content"
        )
        time_el = node.select_one("time, .timestamp, .update-time, .s-js-date")

        author = author_el.get_text(strip=True) if author_el else ""
        body = body_el.get_text("\n", strip=True) if body_el else ""
        when = time_el.get_text(strip=True) if time_el else ""

        raw = node.get_text("\n", strip=True)
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        clean = [
            ln for ln in lines
            if ln.lower() not in CHROME
            and not ln.lower().startswith("write a comment")
            and not ln.lower().startswith("show more")
        ]
        if not author and clean:
            author = clean[0]
            clean = clean[1:]
        if not when:
            for i, ln in enumerate(clean):
                if DATE_RE.search(ln):
                    when = ln
                    clean.pop(i)
                    break
        if not body or "show more" in (body or "").lower()[-20:]:
            msg = []
            for ln in clean:
                if ln == author:
                    continue
                if DATE_RE.search(ln):
                    break
                if ln.lower().startswith("show more"):
                    continue
                msg.append(ln)
            fallback = "\n".join(msg).strip()
            if len(fallback) > len(body or ""):
                body = fallback

        body = re.sub(r"\s*Comment\s*·\s*Like.*$", "", body or "", flags=re.I | re.S).strip()
        body = re.sub(r"\s*Show more.*$", "", body, flags=re.I | re.S).strip()
        if len(body) < 2:
            continue
        key = (author, body[:80])
        if key in seen:
            continue
        seen.add(key)
        updates.append({
            "author": author or "(unknown)",
            "message": body,
            "datetime": when or "",
            "context": context,
        })
    return updates


def extract_links(soup, pattern, fallback="item"):
    items, seen = [], set()
    for a in soup.select(f'a[href*="{pattern}"]'):
        href = a.get("href", "")
        m = re.search(rf"{re.escape(pattern)}(\d+)", href)
        if not m:
            continue
        iid = m.group(1)
        if iid in seen:
            continue
        seen.add(iid)
        items.append({
            "id": iid,
            "name": a.get_text(strip=True) or f"{fallback} {iid}",
            "url": urljoin(BASE, href.split("?")[0]),
        })
    return items


def scrape():
    s = session_from_cookies()
    if not s:
        return {"ok": False, "error": "no cookies"}

    r = get(s, "/home")
    if not r:
        return {"ok": False, "error": "not authenticated"}

    profile = {}
    soup = BeautifulSoup(r.text, "html.parser")
    # user name from header
    for sel in (".user-name", ".name-display", ".s-user-name", "a[href*='/user/']"):
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            profile["name"] = el.get_text(strip=True)
            break
    m = re.search(r"/user/(\d+)", r.text)
    if m:
        profile["user_id"] = m.group(1)

    feed = parse_feed(r.text, r.url, "Home")

    courses = []
    for path in ("/courses", "/home/course-dashboard", "/home"):
        rr = get(s, path)
        if not rr:
            continue
        cs = BeautifulSoup(rr.text, "html.parser")
        courses = extract_links(cs, "/course/", "Course")
        sections = extract_links(cs, "/section/", "Section")
        for sec in sections:
            sec["type"] = "section"
            if not any(x["id"] == sec["id"] for x in courses):
                courses.append(sec)
        if courses:
            break

    groups = []
    rg = get(s, "/groups") or get(s, "/home")
    if rg:
        groups = extract_links(BeautifulSoup(rg.text, "html.parser"), "/group/", "Group")

    return {
        "ok": True,
        "profile": profile,
        "feed": feed,
        "courses": courses[:40],
        "groups": groups[:40],
        "scraped_from": r.url,
    }


if __name__ == "__main__":
    data = scrape()
    json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
