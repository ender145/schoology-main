#!/usr/bin/env python3
"""
FCPS Schoology (lms.fcps.edu) – scrape everything reachable with a web session.

Requires:
  pip install playwright requests beautifulsoup4
  playwright install chromium
"""

from playwright.sync_api import sync_playwright
import requests
from bs4 import BeautifulSoup
import json
import re
import time
import os
from datetime import datetime
from urllib.parse import urljoin, urlparse

# ── credentials ────────────────────────────────────────────────
USERNAME = "1676472"
PASSWORD = "01L!@m2010!"
# ───────────────────────────────────────────────────────────────

BASE = "https://lms.fcps.edu"
OUT_DIR = "output"
os.makedirs(OUT_DIR, exist_ok=True)

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/150.0.0.0 Safari/537.36"
)

CHROME_WORDS = {
    "comment", "like", "·", "*", "write a comment:", "comments", "likes",
    "share", "edit", "delete", "reply", "view comments", "show more",
    "see more", "add comment", "show more…", "show more...", "view",
}

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


# ═══════════════════════════════════════════════════════════════
# Login
# ═══════════════════════════════════════════════════════════════

def login_and_get_cookies():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # True when stable
        context = browser.new_context(user_agent=UA)
        page = context.new_page()

        print("[1] Opening LMS …")
        page.goto(BASE + "/", wait_until="networkidle")
        print(f"    {page.url[:100]}")

        page.wait_for_selector(
            'input[type="text"], input[name="username"], #username',
            timeout=20000,
        )
        page.fill(
            'input[type="text"], input[name="username"], '
            'input[id*="user"], input[placeholder*="User"]',
            USERNAME,
        )
        page.fill('input[type="password"]', PASSWORD)
        page.click(
            'button[type="submit"], button:has-text("Log"), '
            'button:has-text("Sign"), button:has-text("Next")'
        )

        print("[2] Waiting for home …")
        try:
            page.wait_for_url("**/home**", timeout=45000)
        except Exception:
            time.sleep(5)

        print(f"    Landed: {page.url}")
        cookies = context.cookies()
        browser.close()
        return cookies


def make_session(cookies):
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    for c in cookies:
        s.cookies.set(
            c["name"], c["value"],
            domain=c.get("domain", ""),
            path=c.get("path", "/"),
        )
    return s


def get(session, path, **kw):
    url = path if path.startswith("http") else urljoin(BASE, path)
    try:
        r = session.get(url, timeout=25, allow_redirects=True, **kw)
        return r
    except Exception as e:
        print(f"    GET failed {url}: {e}")
        return None


def save_json(name, data):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"    saved {path}")


def save_html(name, text):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text or "")
    print(f"    saved {path}")


# ═══════════════════════════════════════════════════════════════
# Helpers: links, attachments, show_more, post parsing
# ═══════════════════════════════════════════════════════════════

def expand_truncated_posts(session, html, referer):
    expanded = {}
    found = set(re.findall(
        r"/update_post/(\d+)/show_more/([a-f0-9]{20,})", html, flags=re.I
    ))
    if not found:
        return expanded

    print(f"      expanding {len(found)} truncated post(s)…")
    for post_id, token in found:
        url = f"{BASE}/update_post/{post_id}/show_more/{token}"
        try:
            r = session.post(
                url, data=b"",
                headers={
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "X-Requested-With": "XMLHttpRequest",
                    "Origin": BASE,
                    "Referer": referer,
                    "Content-Length": "0",
                },
                timeout=15,
            )
            if r.status_code != 200 or not r.text:
                continue
            html_frag = r.text
            try:
                data = r.json()
                if isinstance(data, dict):
                    for key in ("html", "body", "content", "update", "data", "message"):
                        if key in data and data[key]:
                            val = data[key]
                            html_frag = val if isinstance(val, str) else (
                                val.get("html") or val.get("body") or str(val)
                            )
                            break
                elif isinstance(data, str):
                    html_frag = data
            except Exception:
                pass
            frag = BeautifulSoup(str(html_frag), "html.parser")
            expanded[post_id] = {
                "text": frag.get_text("\n", strip=True) or str(html_frag),
                "html": str(html_frag),
            }
        except Exception as e:
            print(f"        show_more failed {post_id}: {e}")
        time.sleep(0.12)
    return expanded


def extract_links_and_attachments(node):
    links, attachments, seen = [], [], set()

    for a in node.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        full = urljoin(BASE, href)
        text = a.get_text(" ", strip=True) or ""
        low = text.lower()
        if low in CHROME_WORDS or "show_more" in href:
            continue
        if any(x in href for x in ("/like", "/comment", "show_more")):
            continue

        is_file = bool(re.search(
            r"\.(pdf|docx?|pptx?|xlsx?|zip|png|jpe?g|gif|mp4|mov|txt)(\?|$)",
            href, re.I,
        )) or bool(re.search(
            r"/(attachment|file|files|download|system/files)/", href, re.I
        ))

        size = ""
        parent_text = a.parent.get_text(" ", strip=True) if a.parent else ""
        sm = re.search(r"(\d+(?:\.\d+)?\s*(?:KB|MB|GB))", parent_text, re.I)
        if sm:
            size = sm.group(1)

        key = (full, text)
        if key in seen:
            continue
        seen.add(key)

        if is_file or re.search(r"\.(pdf|docx?|pptx?|xlsx?)$", text, re.I):
            attachments.append({
                "name": text or full.split("/")[-1].split("?")[0],
                "url": full,
                "size": size,
            })
        else:
            links.append({"text": text or full, "url": full})

    for img in node.find_all("img", src=True):
        src = img["src"]
        if not src or src.startswith("data:"):
            continue
        full = urljoin(BASE, src)
        if any(x in full.lower() for x in ("avatar", "icon", "emoji", "sprite", "logo")):
            continue
        if full in seen:
            continue
        seen.add(full)
        attachments.append({
            "name": img.get("alt") or "image",
            "url": full,
            "size": "",
            "type": "image",
        })

    return links, attachments


def parse_update_node(node, context_name, context_id, context_url, expanded=None):
    expanded = expanded or {}

    author_el = node.select_one(
        ".update-author, .s-js-author, .user-name, "
        "a[href*='/user/'], .author, .s-like-user"
    )
    body_el = node.select_one(
        ".update-body, .s-edge-type-update-post .update-body, "
        ".feed-item-body, .discussion-content, .s-js-update-body"
    )
    time_el = node.select_one(
        "time, .timestamp, .update-time, .s-js-date, span[title*='20']"
    )

    author = author_el.get_text(strip=True) if author_el else ""
    body = body_el.get_text("\n", strip=True) if body_el else ""
    when = time_el.get_text(strip=True) if time_el else ""

    post_id = None
    m = re.search(r"update_post/(\d+)/show_more/", str(node))
    if m:
        post_id = m.group(1)
    if not post_id:
        for attr in ("id", "data-id", "data-post-id", "data-update-id"):
            val = node.get(attr) or ""
            mm = re.search(r"(\d{6,})", val)
            if mm:
                post_id = mm.group(1)
                break

    extra_html = ""
    if post_id and post_id in expanded:
        exp = expanded[post_id]
        full_text = exp.get("text", "") if isinstance(exp, dict) else str(exp)
        extra_html = exp.get("html", "") if isinstance(exp, dict) else ""
        if len(full_text) > len(body or ""):
            body = full_text

    raw = node.get_text("\n", strip=True)
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    clean = [
        ln for ln in lines
        if ln.lower() not in CHROME_WORDS
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

    if not body or (body and "show more" in body.lower()[-20:]):
        if clean and clean[0] == author:
            clean = clean[1:]
        msg, stop = [], False
        for ln in clean:
            if DATE_RE.search(ln):
                if not when:
                    when = ln
                break
            if ln.lower().startswith("show more"):
                continue
            msg.append(ln)
        fallback = "\n".join(msg).strip()
        if len(fallback) > len(body or ""):
            body = fallback

    body = re.sub(r"\s*Comment\s*·\s*Like.*$", "", body or "", flags=re.I | re.S).strip()
    body = re.sub(r"\s*Show more.*$", "", body, flags=re.I | re.S).strip()
    body = re.sub(r"\n{3,}", "\n\n", body)

    if len(body) < 2 and len(raw) < 20:
        return None

    links, attachments = extract_links_and_attachments(node)
    if extra_html:
        es = BeautifulSoup(extra_html, "html.parser")
        el, ea = extract_links_and_attachments(es)
        seen_l = {(x["url"], x["text"]) for x in links}
        for x in el:
            if (x["url"], x["text"]) not in seen_l:
                links.append(x)
        seen_a = {(x["url"], x["name"]) for x in attachments}
        for x in ea:
            if (x["url"], x["name"]) not in seen_a:
                attachments.append(x)

    # replies
    replies = []
    reply_nodes = node.select(
        ".comment, .s-js-comment, .update-comment, "
        ".discussion-reply, .s-edge-type-update-comment, "
        "li.comment, .s-comments-comment"
    )
    seen_r = set()
    for rn in reply_nodes:
        ra = rn.select_one("a[href*='/user/'], .comment-author, .user-name, .author")
        rb = rn.select_one(".comment-body, .s-js-comment-body, .update-body, p")
        rt = rn.select_one("time, .timestamp, .comment-time, span[title*='20']")
        r_author = ra.get_text(strip=True) if ra else ""
        r_body = rb.get_text("\n", strip=True) if rb else ""
        r_when = rt.get_text(strip=True) if rt else ""

        rlines = [
            ln.strip() for ln in rn.get_text("\n", strip=True).splitlines()
            if ln.strip() and ln.strip().lower() not in CHROME_WORDS
        ]
        if not r_author and rlines:
            r_author = rlines[0]
            rlines = rlines[1:]
        if not r_when:
            for i, ln in enumerate(rlines):
                if DATE_RE.search(ln):
                    r_when = ln
                    rlines.pop(i)
                    break
        if not r_body:
            if rlines and rlines[0] == r_author:
                rlines = rlines[1:]
            r_body = "\n".join(rlines).strip()
        r_body = re.sub(r"\s*Like.*$", "", r_body, flags=re.I | re.S).strip()
        if len(r_body) < 2:
            continue
        key = (r_author, r_body[:60])
        if key in seen_r or (r_author == author and r_body[:40] == body[:40]):
            continue
        seen_r.add(key)
        replies.append({
            "author": r_author or "(unknown)",
            "message": r_body,
            "datetime": r_when or "",
        })

    return {
        "context": context_name,
        "context_id": context_id,
        "author": author or "(unknown)",
        "message": body,
        "datetime": when or "",
        "links": links,
        "attachments": attachments,
        "replies": replies,
        "post_id": post_id or "",
        "source_url": context_url,
    }


def extract_feed_updates(session, html, page_url, context_name, context_id):
    expanded = expand_truncated_posts(session, html, referer=page_url)
    soup = BeautifulSoup(html, "html.parser")

    nodes = soup.select(
        ".s-edge-type-update-post, .s-js-feed-item, "
        "div[data-type='update'], .feed-item, .update-item, "
        "article, .s-edge-feed > div"
    )
    if not nodes:
        for div in soup.find_all(["div", "article", "li"]):
            txt = div.get_text(" ", strip=True)
            if DATE_RE.search(txt) and len(txt) > 40:
                nodes.append(div)

    updates, seen = [], set()
    for node in nodes:
        parsed = parse_update_node(
            node, context_name, context_id, page_url, expanded
        )
        if not parsed:
            continue
        key = (parsed["author"], parsed["message"][:80])
        if key in seen:
            continue
        seen.add(key)
        updates.append(parsed)
    return updates


def extract_id_links(soup, pattern, name_fallback="item"):
    """Generic: find /thing/{id} links."""
    items = []
    seen = set()
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
            "name": a.get_text(strip=True) or f"{name_fallback} {iid}",
            "url": urljoin(BASE, href.split("?")[0]),
        })
    return items


# ═══════════════════════════════════════════════════════════════
# Scrapers for each area
# ═══════════════════════════════════════════════════════════════

def scrape_profile(session):
    print("\n[profile]")
    data = {"pages": {}}
    for path in ("/user", "/settings/account", "/home"):
        r = get(session, path)
        if not r or r.status_code != 200:
            continue
        soup = BeautifulSoup(r.text, "html.parser")
        title = soup.title.get_text(strip=True) if soup.title else ""
        # try common profile fields
        info = {}
        for sel in (".profile-header", ".user-name", ".name-display", "h1", "h2"):
            el = soup.select_one(sel)
            if el:
                info.setdefault("heading", el.get_text(" ", strip=True))
        # any /user/{id} self link
        m = re.search(r"/user/(\d+)", r.url) or re.search(r"/user/(\d+)", r.text)
        if m:
            info["user_id"] = m.group(1)
        data["pages"][path] = {"url": r.url, "title": title, **info}
        save_html(f"page_{path.strip('/').replace('/', '_') or 'home'}.html", r.text)
    save_json("profile.json", data)
    return data


def scrape_groups(session):
    print("\n[groups]")
    r = get(session, "/groups")
    if not r:
        return []
    save_html("groups.html", r.text)
    soup = BeautifulSoup(r.text, "html.parser")
    groups = extract_id_links(soup, "/group/", "Group")

    if not groups:
        r2 = get(session, "/home")
        if r2:
            soup2 = BeautifulSoup(r2.text, "html.parser")
            groups = extract_id_links(soup2, "/group/", "Group")

    print(f"    {len(groups)} group(s)")
    all_updates = []
    detailed = []

    for g in groups:
        print(f"    → {g['name']} ({g['id']})")
        gdata = {"id": g["id"], "name": g["name"], "url": g["url"], "updates": []}
        for suffix in ("/updates", ""):
            url = f"{BASE}/group/{g['id']}{suffix}"
            rr = get(session, url)
            if not rr or rr.status_code != 200:
                continue
            ups = extract_feed_updates(
                session, rr.text, rr.url, g["name"], g["id"]
            )
            if ups:
                gdata["updates"] = ups
                all_updates.extend(ups)
                print(f"      {len(ups)} update(s)")
                break
        # members page if exists
        rm = get(session, f"/group/{g['id']}/members")
        if rm and rm.status_code == 200:
            ms = BeautifulSoup(rm.text, "html.parser")
            members = extract_id_links(ms, "/user/", "User")
            gdata["members"] = members
            print(f"      {len(members)} member link(s)")
        detailed.append(gdata)
        time.sleep(0.3)

    save_json("groups.json", detailed)
    save_json("group_updates.json", all_updates)
    return detailed


def scrape_courses(session):
    print("\n[courses]")
    courses = []
    for path in ("/courses", "/home/course-dashboard", "/home"):
        r = get(session, path)
        if not r or r.status_code != 200:
            continue
        save_html(f"courses_from_{path.strip('/').replace('/', '_') or 'home'}.html", r.text)
        soup = BeautifulSoup(r.text, "html.parser")
        found = extract_id_links(soup, "/course/", "Course")
        # also section links
        sections = extract_id_links(soup, "/section/", "Section")
        for c in found:
            if not any(x["id"] == c["id"] for x in courses):
                courses.append(c)
        for s in sections:
            s["type"] = "section"
            if not any(x["id"] == s["id"] for x in courses):
                courses.append(s)
        if courses:
            break

    print(f"    {len(courses)} course/section link(s)")
    detailed = []
    all_updates = []

    for c in courses:
        print(f"    → {c['name']} ({c['id']})")
        cdata = {**c, "updates": [], "materials": []}
        # try course/section pages
        candidates = [
            c["url"],
            f"{BASE}/course/{c['id']}",
            f"{BASE}/section/{c['id']}",
            f"{BASE}/course/{c['id']}/materials",
            f"{BASE}/course/{c['id']}/updates",
        ]
        for url in candidates:
            rr = get(session, url)
            if not rr or rr.status_code != 200:
                continue
            if "login" in rr.url.lower():
                continue
            ups = extract_feed_updates(
                session, rr.text, rr.url, c["name"], c["id"]
            )
            if ups and not cdata["updates"]:
                cdata["updates"] = ups
                all_updates.extend(ups)
                print(f"      {len(ups)} update(s)")
            # material / folder links
            soup = BeautifulSoup(rr.text, "html.parser")
            for a in soup.select("a[href]"):
                href = a.get("href", "")
                text = a.get_text(strip=True)
                if any(x in href for x in (
                    "/assignment/", "/document/", "/page/",
                    "/discussion/", "/album/", "/folder/",
                )):
                    cdata["materials"].append({
                        "name": text,
                        "url": urljoin(BASE, href),
                    })
        # de-dupe materials
        seen = set()
        mats = []
        for m in cdata["materials"]:
            if m["url"] in seen:
                continue
            seen.add(m["url"])
            mats.append(m)
        cdata["materials"] = mats
        detailed.append(cdata)
        time.sleep(0.3)

    save_json("courses.json", detailed)
    save_json("course_updates.json", all_updates)
    return detailed


def scrape_home_feed(session):
    print("\n[home feed]")
    r = get(session, "/home")
    if not r:
        return []
    save_html("home.html", r.text)
    updates = extract_feed_updates(session, r.text, r.url, "Home", "home")
    print(f"    {len(updates)} update(s) on home")
    save_json("home_feed.json", updates)
    return updates


def scrape_messages(session):
    print("\n[messages]")
    data = {"inbox": [], "sent": []}
    for folder in ("inbox", "sent"):
        r = get(session, f"/messages/{folder}")
        if not r or r.status_code != 200:
            # alternate paths
            r = get(session, f"/mailbox/{folder}")
        if not r or r.status_code != 200:
            continue
        save_html(f"messages_{folder}.html", r.text)
        soup = BeautifulSoup(r.text, "html.parser")
        # message rows
        for row in soup.select(
            ".message, .mail-item, tr.message, .s-js-message, "
            "a[href*='/messages/'], a[href*='/mailbox/']"
        ):
            text = row.get_text(" ", strip=True)
            if len(text) < 5:
                continue
            link = row.get("href") if row.name == "a" else None
            if not link:
                a = row.select_one("a[href]")
                link = a["href"] if a else ""
            data[folder].append({
                "preview": text[:300],
                "url": urljoin(BASE, link) if link else "",
            })
        print(f"    {folder}: {len(data[folder])} item(s)")
    save_json("messages.json", data)
    return data


def scrape_calendar(session):
    print("\n[calendar / events]")
    events = []
    for path in ("/calendar", "/home/calendar", "/events"):
        r = get(session, path)
        if not r or r.status_code != 200:
            continue
        save_html(f"calendar_{path.strip('/').replace('/', '_') or 'root'}.html", r.text)
        soup = BeautifulSoup(r.text, "html.parser")
        for el in soup.select(
            ".event, .calendar-event, .fc-event, "
            "[class*='event'], a[href*='/event/']"
        ):
            text = el.get_text(" ", strip=True)
            if len(text) < 4:
                continue
            href = el.get("href") or ""
            a = el.select_one("a[href]") if not href else None
            if a:
                href = a.get("href", "")
            events.append({
                "text": text[:400],
                "url": urljoin(BASE, href) if href else "",
            })
        if events:
            break
    # de-dupe
    seen, out = set(), []
    for e in events:
        if e["text"] in seen:
            continue
        seen.add(e["text"])
        out.append(e)
    print(f"    {len(out)} event-like item(s)")
    save_json("calendar.json", out)
    return out


def scrape_grades(session):
    print("\n[grades]")
    grades = []
    for path in ("/grades", "/grades/grades", "/user/grades", "/home/grades"):
        r = get(session, path)
        if not r or r.status_code != 200:
            continue
        if "login" in r.url.lower():
            continue
        save_html(f"grades_{path.strip('/').replace('/', '_')}.html", r.text)
        soup = BeautifulSoup(r.text, "html.parser")
        # tables
        for tr in soup.select("table tr"):
            cells = [td.get_text(" ", strip=True) for td in tr.select("th, td")]
            if len(cells) >= 2:
                grades.append({"cells": cells})
        for el in soup.select(".grade, .grade-item, [class*='grade']"):
            t = el.get_text(" ", strip=True)
            if t and len(t) > 2:
                grades.append({"text": t[:300]})
        if grades:
            print(f"    found grade data via {path}")
            break
    save_json("grades.json", grades)
    return grades


def scrape_notifications(session):
    print("\n[notifications]")
    items = []
    for path in ("/notifications", "/home/notifications", "/recent-activity"):
        r = get(session, path)
        if not r or r.status_code != 200:
            continue
        save_html(f"notifications_{path.strip('/').replace('/', '_')}.html", r.text)
        soup = BeautifulSoup(r.text, "html.parser")
        for el in soup.select(
            ".notification, .activity-item, .s-js-notification, li, .feed-item"
        ):
            t = el.get_text(" ", strip=True)
            if len(t) > 15:
                items.append(t[:400])
        if items:
            break
    # de-dupe
    items = list(dict.fromkeys(items))
    print(f"    {len(items)} notification-like item(s)")
    save_json("notifications.json", items)
    return items


def probe_api_ish(session):
    """Hit common paths and record status + content-type (discovery)."""
    print("\n[endpoint probe]")
    paths = [
        "/users/me",
        "/api",
        "/iapi",
        "/v1/users/me",
        "/home",
        "/groups",
        "/courses",
        "/messages/inbox",
        "/calendar",
        "/grades",
        "/notifications",
        "/search",
        "/recent",
    ]
    results = []
    for path in paths:
        r = get(session, path)
        if not r:
            results.append({"path": path, "error": True})
            continue
        results.append({
            "path": path,
            "status": r.status_code,
            "final_url": r.url,
            "content_type": r.headers.get("content-type", ""),
            "length": len(r.text or ""),
            "snippet": (r.text or "")[:120].replace("\n", " "),
        })
        print(f"    {path} → {r.status_code} ({r.headers.get('content-type', '')[:40]})")
        time.sleep(0.15)
    save_json("endpoint_probe.json", results)
    return results


# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("FCPS Schoology full scrape")
    print("=" * 60)

    cookies = login_and_get_cookies()
    session = make_session(cookies)

    r = get(session, "/home")
    if not r or ("login" in r.url.lower() and "/home" not in r.url):
        print("ERROR: session not authenticated")
        return
    print("[✓] Authenticated session OK")

    # save cookies for reuse
    save_json("cookies.json", [
        {"name": c["name"], "value": c["value"], "domain": c.get("domain"), "path": c.get("path")}
        for c in cookies
    ])

    summary = {
        "scraped_at": datetime.utcnow().isoformat() + "Z",
        "base": BASE,
    }

    summary["probe"] = probe_api_ish(session)
    summary["profile"] = scrape_profile(session)
    summary["home_feed_count"] = len(scrape_home_feed(session))
    groups = scrape_groups(session)
    summary["groups_count"] = len(groups)
    summary["group_updates_count"] = sum(len(g.get("updates") or []) for g in groups)
    courses = scrape_courses(session)
    summary["courses_count"] = len(courses)
    summary["messages"] = scrape_messages(session)
    summary["calendar_count"] = len(scrape_calendar(session))
    summary["grades_count"] = len(scrape_grades(session))
    summary["notifications_count"] = len(scrape_notifications(session))

    save_json("summary.json", summary)

    print("\n" + "=" * 60)
    print("DONE")
    print(f"  Groups:        {summary['groups_count']}")
    print(f"  Group updates: {summary['group_updates_count']}")
    print(f"  Courses:       {summary['courses_count']}")
    print(f"  Home updates:  {summary['home_feed_count']}")
    print(f"  Output folder: {OUT_DIR}/")
    print("=" * 60)


if __name__ == "__main__":
    main()