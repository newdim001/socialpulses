#!/usr/bin/env python3
"""
SocialPulses Comprehensive Backend/Functionality Audit - v2
Directly uses auth token, tests ALL endpoints
"""
import json, os, time, subprocess, urllib.request, urllib.error, sys

BASE = "http://localhost:8007"
TOKEN = None
RESULTS = {"total": 0, "passed": 0, "failed": 0, "warnings": 0, "details": []}

def log(status, msg):
    RESULTS["total"] += 1
    key_map = {"PASS": "passed", "FAIL": "failed", "WARN": "warnings"}
    RESULTS[key_map.get(status, "warnings")] += 1
    RESULTS["details"].append({"status": status, "msg": msg})
    icon = {"PASS":"✓", "FAIL":"✗", "WARN":"⚠"}
    print(f"  {icon.get(status, '?')} {msg}")

def section(t):
    print(f"\n{'='*60}\n  {t}\n{'='*60}")

def api(method, path, data=None, raw_response=False, expect_status=None, multipart_data=None):
    url = f"{BASE}{path}"
    if multipart_data:
        boundary = "----Bound" + os.urandom(16).hex()
        body = b""
        for name, (filename, content, mime) in multipart_data.items():
            body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\nContent-Type: {mime}\r\n\r\n".encode()
            body += content if isinstance(content, bytes) else content.encode()
            body += b"\r\n"
        body += f"--{boundary}--\r\n".encode()
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    elif data is not None:
        body = json.dumps(data).encode()
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", "application/json")
    else:
        req = urllib.request.Request(url, method=method)
    
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        status = resp.status
        raw = resp.read()
        if raw_response:
            return (status, raw, None)
        try:
            body = json.loads(raw)
        except:
            body = raw.decode()
        if expect_status and status != expect_status:
            log("FAIL", f"Expected {expect_status}, got {status} for {method} {path}")
        return (status, body, None)
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except:
            body = str(e)
        if expect_status and e.code != expect_status:
            log("FAIL", f"Expected {expect_status}, got {e.code} for {method} {path}")
        return (e.code, body, str(e))
    except Exception as e:
        log("FAIL", f"Exception: {method} {path}: {e}")
        return (None, None, str(e))

# ─── LOGIN ───
section("AUTHENTICATION")
s, b, _ = api("POST", "/api/auth/login", {"username":"sam@test.com","password":"Dxb@2026"})
if s == 200 and "token" in b:
    TOKEN = b["token"]
    log("PASS", f"Login OK - client_id={b.get('client_id')}, role={b.get('role')}")
else:
    log("FAIL", f"Login failed: {s}")
    sys.exit(1)

# Verify
s, b, _ = api("GET", "/api/auth/check")
log("PASS" if s == 200 else "FAIL", f"GET /api/auth/check: {s}")

s, b, _ = api("GET", "/api/auth/me")
log("PASS" if s == 200 else "FAIL", f"GET /api/auth/me: {s}")

# ─── AUTH EDGE CASES ───
s, b, _ = api("POST", "/api/auth/login", {"username":"sam@test.com","password":"WRONG"})
log("PASS" if s == 401 else "FAIL", f"Wrong password returns {s} (expect 401)")

s, b, _ = api("POST", "/api/auth/login", {})
log("PASS" if s == 422 else "FAIL", f"Missing fields returns {s} (expect 422)")

# ─── GUIDES ───
section("PLATFORMS & ACCOUNTS")

s, b, _ = api("GET", "/api/platforms")
log("PASS" if s == 200 else "FAIL", f"GET /api/platforms ({len(b)} platforms)" if s == 200 else f"GET /api/platforms: {s}")

s, b, _ = api("GET", "/api/accounts")
log("PASS" if s == 200 else "FAIL", f"GET /api/accounts")

s, b, _ = api("GET", "/api/clients")
log("PASS" if s == 200 else "FAIL", f"GET /api/clients")

# Test non-existent account
s, b, _ = api("GET", "/api/accounts/99999")
log("PASS" if s == 404 else "FAIL", f"GET /api/accounts/99999 returns {s} (expect 404)")

# ─── POSTS ───
section("POSTS CRUD")

# Create
s, b, _ = api("POST", "/api/posts", {"content":"Audit test post","platforms":["twitter"],"scheduled_at":None})
post_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/posts (id={post_id})")

# List
s, b, _ = api("GET", "/api/posts")
log("PASS" if s == 200 else "FAIL", f"GET /api/posts")

# Get
if post_id:
    s, b, _ = api("GET", f"/api/posts/{post_id}")
    log("PASS" if s == 200 else "FAIL", f"GET /api/posts/{post_id}")

# Update
if post_id:
    s, b, _ = api("PUT", f"/api/posts/{post_id}", {"content":"Updated content"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/posts/{post_id}")

# Schedule in future
if post_id:
    future = (__import__('datetime').datetime.utcnow() + __import__('datetime').timedelta(hours=48)).isoformat()
    s, b, _ = api("PUT", f"/api/posts/{post_id}", {"content":"Scheduled post","scheduled_at":future})
    log("PASS" if s == 200 else "FAIL", f"Schedule post")

# Publish now
if post_id:
    s, b, _ = api("POST", f"/api/posts/{post_id}/publish-now")
    log("PASS" if s == 200 else "WARN" if s == 400 else "FAIL", f"POST /api/posts/{post_id}/publish-now: {s}")

# Duplicate
if post_id:
    s, b, _ = api("POST", f"/api/posts/{post_id}/duplicate")
    log("PASS" if s == 200 else "FAIL", f"POST /api/posts/{post_id}/duplicate")

# Pending approval
s, b, _ = api("GET", "/api/posts/pending-approval")
log("PASS" if s == 200 else "FAIL", f"GET /api/posts/pending-approval")

# Approve
if post_id:
    s, b, _ = api("PUT", f"/api/posts/{post_id}/approve")
    log("PASS" if s == 200 else "FAIL", f"PUT /api/posts/{post_id}/approve")

# Reject
if post_id:
    s, b, _ = api("PUT", f"/api/posts/{post_id}/reject")
    log("PASS" if s == 200 else "FAIL", f"PUT /api/posts/{post_id}/reject")

# Versions
if post_id:
    s, b, _ = api("GET", f"/api/posts/{post_id}/versions")
    log("PASS" if s == 200 else "FAIL", f"GET /api/posts/{post_id}/versions")

# First comment
if post_id:
    s, b, _ = api("GET", f"/api/posts/{post_id}/first-comment")
    log("PASS" if s == 200 else "FAIL", f"GET /api/posts/{post_id}/first-comment")

if post_id:
    s, b, _ = api("PUT", f"/api/posts/{post_id}/first-comment", {"content":"First! 🎉"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/posts/{post_id}/first-comment")

# Tags
if post_id:
    s, b, _ = api("POST", f"/api/posts/{post_id}/tags", {"tag_ids":[]})
    log("PASS" if s == 200 else "FAIL", f"POST /api/posts/{post_id}/tags")

if post_id:
    s, b, _ = api("GET", f"/api/posts/{post_id}/tags")
    log("PASS" if s == 200 else "FAIL", f"GET /api/posts/{post_id}/tags")

# Approval comments
if post_id:
    s, b, _ = api("GET", f"/api/posts/{post_id}/approval-comments")
    log("PASS" if s == 200 else "FAIL", f"GET /api/posts/{post_id}/approval-comments")

if post_id:
    s, b, _ = api("POST", f"/api/posts/{post_id}/approval-comments", {"content":"Looks good!"})
    log("PASS" if s == 200 else "FAIL", f"POST /api/posts/{post_id}/approval-comments")

# Sentiment analysis
if post_id:
    s, b, _ = api("POST", f"/api/posts/{post_id}/analyze-sentiment")
    log("PASS" if s == 200 else "WARN" if s in (400,503) else "FAIL", f"POST /api/posts/{post_id}/analyze-sentiment: {s}")

# Delete
if post_id:
    s, b, _ = api("DELETE", f"/api/posts/{post_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/posts/{post_id}")

# Get deleted returns 404
if post_id:
    s, b, _ = api("GET", f"/api/posts/{post_id}")
    log("PASS" if s == 404 else "FAIL", f"GET deleted post returns {s} (expect 404)")

# ─── BULK POSTS ───
section("BULK POSTS")
s, b, _ = api("POST", "/api/posts/bulk", {"posts":[
    {"content":"Bulk 1","platforms":["twitter"]},
    {"content":"Bulk 2","platforms":["linkedin"]}
]})
log("PASS" if s == 200 else "FAIL", f"POST /api/posts/bulk: {s}")

# ─── MEDIA ───
section("MEDIA")

# Create test image
test_img = "/tmp/test_audit.png"
subprocess.run(["python3","-c",f"from PIL import Image; Image.new('RGB',(50,50),color='blue').save('{test_img}')"], capture_output=True)

with open(test_img, "rb") as f:
    img_bytes = f.read()

s, b, _ = api("POST", "/api/media/upload", multipart_data={
    "file": ("test.png", img_bytes, "image/png")
})
media_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/media/upload (id={media_id})")

s, b, _ = api("GET", "/api/media")
log("PASS" if s == 200 else "FAIL", f"GET /api/media")

if media_id:
    s, b, _ = api("GET", f"/api/media/{media_id}/serve", raw_response=True)
    log("PASS" if s == 200 else "FAIL", f"GET /api/media/{media_id}/serve: {s}")

# Media update
if media_id:
    s, b, _ = api("PUT", f"/api/media/{media_id}", {"alt_text":"Test image"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/media/{media_id}")

if media_id:
    s, b, _ = api("DELETE", f"/api/media/{media_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/media/{media_id}")

# Media folders
s, b, _ = api("GET", "/api/media/folders")
log("PASS" if s == 200 else "FAIL", f"GET /api/media/folders")

s, b, _ = api("POST", "/api/media/folders", {"name":"Audit Folder"})
folder_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/media/folders")

if folder_id:
    s, b, _ = api("DELETE", f"/api/media/folders/{folder_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/media/folders/{folder_id}")

# ─── DASHBOARD & ANALYTICS ───
section("DASHBOARD & ANALYTICS")
for ep in ["/api/dashboard","/api/calendar","/api/analytics/summary",
           "/api/analytics/calendar-heatmap","/api/analytics/best-time",
           "/api/analytics/sentiment","/api/analytics/competitive",
           "/api/analytics/timeline","/api/analytics/by-tag",
           "/api/analytics/extended"]:
    s, b, _ = api("GET", ep)
    log("PASS" if s == 200 else "FAIL", f"GET {ep}: {s}")

# ─── AI ───
section("AI GENERATION")

for label, ep, data in [
    ("generate", "/api/ai/generate", {"prompt":"Write a tweet","platform":"twitter","tone":"professional"}),
    ("variations", "/api/ai/variations", {"content":"Original post"}),
    ("content-ideas", "/api/ai/content-ideas", {"topic":"technology","count":3}),
    ("best-time", "/api/ai/best-time", {"platform":"instagram"}),
    ("sentiment", "/api/ai/sentiment", {"text":"This is great!"}),
    ("reply-suggestions", "/api/ai/reply-suggestions", {"conversation":"Hello!","platform":"twitter"}),
    ("repurpose", "/api/ai/repurpose", {"content":"Blog content","target_platform":"twitter"}),
]:
    s, b, _ = api("POST", ep, data)
    if s == 200:
        log("PASS", f"POST {ep}")
    elif s == 503:
        log("WARN", f"POST {ep}: 503 (AI service not configured)")
    else:
        log("FAIL" if s != 200 else "PASS", f"POST {ep}: {s}")

# ─── SAVED REPLIES ───
section("SAVED REPLIES")
s, b, _ = api("GET", "/api/saved-replies")
log("PASS" if s == 200 else "FAIL", f"GET /api/saved-replies")

s, b, _ = api("POST", "/api/saved-replies", {"title":"Thanks!","content":"Thanks for reaching out!","platform":"twitter"})
sr_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/saved-replies (id={sr_id})")

if sr_id:
    s, b, _ = api("PUT", f"/api/saved-replies/{sr_id}", {"content":"Updated reply"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/saved-replies/{sr_id}")
    s, b, _ = api("DELETE", f"/api/saved-replies/{sr_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/saved-replies/{sr_id}")

# ─── POST TEMPLATES ───
section("POST TEMPLATES")
s, b, _ = api("GET", "/api/post-templates")
log("PASS" if s == 200 else "FAIL", f"GET /api/post-templates")

s, b, _ = api("POST", "/api/post-templates", {"name":"Audit Tmpl","content":"Template {var}","platform":"twitter"})
tmpl_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/post-templates (id={tmpl_id})")

if tmpl_id:
    s, b, _ = api("PUT", f"/api/post-templates/{tmpl_id}", {"content":"Updated tmpl"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/post-templates/{tmpl_id}")
    s, b, _ = api("DELETE", f"/api/post-templates/{tmpl_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/post-templates/{tmpl_id}")

# ─── RSS FEEDS ───
section("RSS FEEDS")
s, b, _ = api("GET", "/api/rss-feeds")
log("PASS" if s == 200 else "FAIL", f"GET /api/rss-feeds")

s, b, _ = api("POST", "/api/rss-feeds", {"url":"https://example.com/rss","name":"Test Feed"})
feed_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "WARN" if s == 400 else "FAIL", f"POST /api/rss-feeds: {s}")

if feed_id:
    s, b, _ = api("PUT", f"/api/rss-feeds/{feed_id}", {"name":"Updated Feed"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/rss-feeds/{feed_id}")
    s, b, _ = api("DELETE", f"/api/rss-feeds/{feed_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/rss-feeds/{feed_id}")

# ─── HASHTAG GROUPS ───
section("HASHTAG GROUPS")
s, b, _ = api("GET", "/api/hashtag-groups")
log("PASS" if s == 200 else "FAIL", f"GET /api/hashtag-groups")

for ep in ["/api/hashtag-groups", "/api/hashtags/groups"]:
    s, b, _ = api("POST", ep, {"name":"Tech","hashtags":"#AI #Tech #ML"})
    hg_id = b.get("id") if s == 200 else None
    log("PASS" if s == 200 else "FAIL", f"POST {ep} (id={hg_id})")
    if hg_id:
        s, b, _ = api("PUT", f"/api/hashtags/groups/{hg_id}", {"name":"Updated"})
        log("PASS" if s == 200 else "FAIL", f"PUT /api/hashtags/groups/{hg_id}")
        s, b, _ = api("DELETE", f"/api/hashtags/groups/{hg_id}")
        log("PASS" if s == 200 else "FAIL", f"DELETE /api/hashtags/groups/{hg_id}")
        break

# ─── LINK-IN-BIO ───
section("LINK-IN-BIO")
s, b, _ = api("GET", "/api/link-bio")
log("PASS" if s == 200 else "FAIL", f"GET /api/link-bio")

s, b, _ = api("POST", "/api/link-bio", {"title":"My Links","username":"samslinks"})
lb_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/link-bio (id={lb_id})")

if lb_id:
    s, b, _ = api("PUT", f"/api/link-bio/{lb_id}", {"title":"Updated Links"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/link-bio/{lb_id}")
    
    s, b, _ = api("POST", f"/api/link-bio/{lb_id}/links", {"title":"My Site","url":"https://example.com"})
    link_id = b.get("id") if s == 200 else None
    log("PASS" if s == 200 else "FAIL", f"POST /api/link-bio/{lb_id}/links (id={link_id})")
    
    if link_id:
        s, b, _ = api("PUT", f"/api/link-bio/links/{link_id}", {"title":"Updated Link"})
        log("PASS" if s == 200 else "FAIL", f"PUT /api/link-bio/links/{link_id}")
        
        # Reorder
        s, b, _ = api("PUT", f"/api/link-bio/{lb_id}/links/reorder", {"link_ids":[link_id]})
        log("PASS" if s == 200 else "FAIL", f"PUT /api/link-bio/{lb_id}/links/reorder")
        
        s, b, _ = api("DELETE", f"/api/link-bio/links/{link_id}")
        log("PASS" if s == 200 else "FAIL", f"DELETE /api/link-bio/links/{link_id}")
    
    # Get links
    s, b, _ = api("GET", f"/api/link-bio/{lb_id}/links")
    log("PASS" if s == 200 else "FAIL", f"GET /api/link-bio/{lb_id}/links")
    
    # Public link page
    s, b, _ = api("GET", f"/link/samslinks")
    log("PASS" if s in (200, 404) else "FAIL", f"GET /link/samslinks: {s}")
    
    s, b, _ = api("DELETE", f"/api/link-bio/{lb_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/link-bio/{lb_id}")

# ─── UTM TEMPLATES ───
section("UTM TEMPLATES")
s, b, _ = api("GET", "/api/utm-templates")
log("PASS" if s == 200 else "FAIL", f"GET /api/utm-templates")

s, b, _ = api("GET", "/api/utm-templates/default")
log("PASS" if s == 200 else "FAIL", f"GET /api/utm-templates/default")

s, b, _ = api("POST", "/api/utm-templates", {"name":"Campaign","source":"social","medium":"social","campaign":"audit"})
utm_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/utm-templates (id={utm_id})")

if utm_id:
    s, b, _ = api("PUT", f"/api/utm-templates/{utm_id}", {"name":"Updated UTM"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/utm-templates/{utm_id}")
    
    s, b, _ = api("POST", f"/api/utm-templates/{utm_id}/apply", {"url":"https://example.com"})
    log("PASS" if s == 200 else "FAIL", f"POST /api/utm-templates/{utm_id}/apply")
    
    s, b, _ = api("DELETE", f"/api/utm-templates/{utm_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/utm-templates/{utm_id}")

# ─── CAMPAIGNS ───
section("CAMPAIGNS")
s, b, _ = api("GET", "/api/campaigns")
log("PASS" if s == 200 else "FAIL", f"GET /api/campaigns")

s, b, _ = api("POST", "/api/campaigns", {"name":"Audit Campaign","description":"Testing"})
camp_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/campaigns (id={camp_id})")

if camp_id:
    s, b, _ = api("GET", f"/api/campaigns/{camp_id}")
    log("PASS" if s == 200 else "FAIL", f"GET /api/campaigns/{camp_id}")
    
    s, b, _ = api("PUT", f"/api/campaigns/{camp_id}", {"name":"Updated Campaign"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/campaigns/{camp_id}")
    
    # Phases
    s, b, _ = api("POST", f"/api/campaigns/{camp_id}/phases", {"name":"Phase 1","order":1,"start_date":"2026-06-01","end_date":"2026-07-01"})
    phase_id = b.get("id") if s == 200 else None
    log("PASS" if s == 200 else "FAIL", f"POST /api/campaigns/{camp_id}/phases (id={phase_id})")
    
    if phase_id:
        s, b, _ = api("PUT", f"/api/campaigns/phases/{phase_id}", {"name":"Updated Phase"})
        log("PASS" if s == 200 else "FAIL", f"PUT /api/campaigns/phases/{phase_id}")
        s, b, _ = api("DELETE", f"/api/campaigns/phases/{phase_id}")
        log("PASS" if s == 200 else "FAIL", f"DELETE /api/campaigns/phases/{phase_id}")
    
    s, b, _ = api("GET", f"/api/campaigns/{camp_id}/phases")
    log("PASS" if s == 200 else "FAIL", f"GET /api/campaigns/{camp_id}/phases")
    
    # Campaign posts
    s, b, _ = api("POST", f"/api/campaigns/{camp_id}/posts", {"content":"Campaign post","platforms":["twitter"]})
    cp_id = b.get("id") if s == 200 else None
    log("PASS" if s == 200 else "FAIL", f"POST /api/campaigns/{camp_id}/posts (id={cp_id})")
    
    if cp_id:
        s, b, _ = api("DELETE", f"/api/campaigns/posts/{cp_id}")
        log("PASS" if s == 200 else "FAIL", f"DELETE /api/campaigns/posts/{cp_id}")
    
    # Update status
    s, b, _ = api("PUT", f"/api/campaigns/{camp_id}/status", {"status":"active"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/campaigns/{camp_id}/status")
    
    s, b, _ = api("DELETE", f"/api/campaigns/{camp_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/campaigns/{camp_id}")

# ─── SPIKE ALERTS ───
section("SPIKE ALERTS")
s, b, _ = api("GET", "/api/spike-alerts")
log("PASS" if s == 200 else "FAIL", f"GET /api/spike-alerts")

s, b, _ = api("POST", "/api/spike-alerts", {"keyword":"audit","threshold":10})
spike_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/spike-alerts (id={spike_id})")

if spike_id:
    s, b, _ = api("PUT", f"/api/spike-alerts/{spike_id}", {"threshold":20})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/spike-alerts/{spike_id}")
    s, b, _ = api("DELETE", f"/api/spike-alerts/{spike_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/spike-alerts/{spike_id}")

s, b, _ = api("GET", "/api/spike-alerts/events")
log("PASS" if s == 200 else "FAIL", f"GET /api/spike-alerts/events")

s, b, _ = api("POST", "/api/spike-alerts/check", {"text":"Check this for spikes"})
log("PASS" if s == 200 else "FAIL", f"POST /api/spike-alerts/check")

# ─── INBOX ───
section("INBOX")
s, b, _ = api("GET", "/api/inbox/conversations")
log("PASS" if s == 200 else "FAIL", f"GET /api/inbox/conversations")

s, b, _ = api("POST", "/api/inbox/conversations", {"platform":"twitter","platform_user_id":"12345","platform_username":"audit_user","content":"Hello from audit!"})
conv_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/inbox/conversations (id={conv_id})")

if conv_id:
    s, b, _ = api("GET", f"/api/inbox/conversations/{conv_id}")
    log("PASS" if s == 200 else "FAIL", f"GET /api/inbox/conversations/{conv_id}")
    
    s, b, _ = api("POST", f"/api/inbox/conversations/{conv_id}/reply", {"content":"Reply from audit"})
    log("PASS" if s == 200 else "FAIL", f"POST /api/inbox/conversations/{conv_id}/reply")
    
    s, b, _ = api("PUT", f"/api/inbox/conversations/{conv_id}/archive")
    log("PASS" if s == 200 else "FAIL", f"PUT /api/inbox/conversations/{conv_id}/archive")
    
    s, b, _ = api("PUT", f"/api/inbox/conversations/{conv_id}/assign", {"user_id": 1})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/inbox/conversations/{conv_id}/assign")
    
    s, b, _ = api("DELETE", f"/api/inbox/conversations/{conv_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/inbox/conversations/{conv_id}")

# ─── KANBAN ───
section("KANBAN")
s, b, _ = api("GET", "/api/kanban/columns")
log("PASS" if s == 200 else "FAIL", f"GET /api/kanban/columns")

s, b, _ = api("POST", "/api/kanban/columns", {"name":"Audit Column","order":1})
col_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/kanban/columns (id={col_id})")

if col_id:
    s, b, _ = api("PUT", f"/api/kanban/columns/{col_id}", {"name":"Updated Col"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/kanban/columns/{col_id}")
    s, b, _ = api("DELETE", f"/api/kanban/columns/{col_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/kanban/columns/{col_id}")

s, b, _ = api("GET", "/api/kanban/cards")
log("PASS" if s == 200 else "FAIL", f"GET /api/kanban/cards")

s, b, _ = api("POST", "/api/kanban/cards", {"title":"Audit Card","column_id":1})
card_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/kanban/cards (id={card_id})")

if card_id:
    s, b, _ = api("PUT", f"/api/kanban/cards/{card_id}", {"title":"Updated Card"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/kanban/cards/{card_id}")
    s, b, _ = api("DELETE", f"/api/kanban/cards/{card_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/kanban/cards/{card_id}")

# ─── NOTIFICATIONS ───
section("NOTIFICATIONS")
s, b, _ = api("GET", "/api/notifications")
log("PASS" if s == 200 else "FAIL", f"GET /api/notifications")

s, b, _ = api("GET", "/api/notifications/count")
log("PASS" if s == 200 else "FAIL", f"GET /api/notifications/count")

s, b, _ = api("POST", "/api/notifications/read-all")
log("PASS" if s == 200 else "FAIL", f"POST /api/notifications/read-all")

# ─── RECURRING ───
section("RECURRING")
s, b, _ = api("GET", "/api/recurring/slots")
log("PASS" if s == 200 else "FAIL", f"GET /api/recurring/slots")

s, b, _ = api("POST", "/api/recurring/slots", {"day_of_week":1,"time":"10:00","platform":"twitter"})
slot_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/recurring/slots (id={slot_id})")

if slot_id:
    s, b, _ = api("PUT", f"/api/recurring/slots/{slot_id}", {"time":"14:00"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/recurring/slots/{slot_id}")
    s, b, _ = api("DELETE", f"/api/recurring/slots/{slot_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/recurring/slots/{slot_id}")

s, b, _ = api("POST", "/api/recurring/generate", {"content":"Recurring post","platforms":["twitter"]})
log("PASS" if s == 200 else "FAIL", f"POST /api/recurring/generate: {s}")

# ─── TAGS ───
section("TAGS / POST TAGS")
s, b, _ = api("GET", "/api/tags")
log("PASS" if s == 200 else "FAIL", f"GET /api/tags")

s, b, _ = api("POST", "/api/tags", {"name":"audit-tag","color":"#ff0000"})
tag_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/tags (id={tag_id})")

if tag_id:
    s, b, _ = api("PUT", f"/api/tags/{tag_id}", {"name":"audit-tag-updated"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/tags/{tag_id}")
    s, b, _ = api("DELETE", f"/api/tags/{tag_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/tags/{tag_id}")

# ─── WEBHOOKS ───
section("WEBHOOKS")
s, b, _ = api("GET", "/api/webhooks")
log("PASS" if s == 200 else "FAIL", f"GET /api/webhooks")

s, b, _ = api("POST", "/api/webhooks", {"url":"https://example.com/hook","events":["post.published"],"platform":"twitter"})
wh_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/webhooks (id={wh_id})")

if wh_id:
    s, b, _ = api("POST", "/api/webhooks/test", {"webhook_id":wh_id,"event_type":"post.published"})
    log("PASS" if s == 200 else "FAIL", f"POST /api/webhooks/test")
    s, b, _ = api("DELETE", f"/api/webhooks/{wh_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/webhooks/{wh_id}")

s, b, _ = api("GET", "/api/webhooks/deliveries")
log("PASS" if s == 200 else "FAIL", f"GET /api/webhooks/deliveries")

# ─── PUBLISHER / WORKER STATUS ───
section("WORKER STATUSES")
for ep in ["/api/publisher/status","/api/trending-scanner/status","/api/auto-reply-worker/status"]:
    s, b, _ = api("GET", ep)
    log("PASS" if s == 200 else "FAIL", f"GET {ep}: {s}")

# ─── TRENDING ───
section("TRENDING")
s, b, _ = api("GET", "/api/trending/topics")
log("PASS" if s == 200 else "FAIL", f"GET /api/trending/topics")

s, b, _ = api("POST", "/api/trending/topics", {"name":"AI","platform":"twitter"})
tr_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/trending/topics (id={tr_id})")

if tr_id:
    s, b, _ = api("PUT", f"/api/trending/topics/{tr_id}", {"name":"AI Updated"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/trending/topics/{tr_id}")
    s, b, _ = api("DELETE", f"/api/trending/topics/{tr_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/trending/topics/{tr_id}")

s, b, _ = api("POST", "/api/trending/scan", {"platform":"twitter"})
log("PASS" if s == 200 else "FAIL", f"POST /api/trending/scan: {s}")

# ─── AUTO-REPLY ───
section("AUTO-REPLY")
s, b, _ = api("GET", "/api/auto-reply/rules")
log("PASS" if s == 200 else "FAIL", f"GET /api/auto-reply/rules")

s, b, _ = api("POST", "/api/auto-reply/rules", {"name":"Audit Rule","trigger_keywords":"hello","platform":"twitter"})
ar_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/auto-reply/rules (id={ar_id})")

if ar_id:
    s, b, _ = api("PUT", f"/api/auto-reply/rules/{ar_id}", {"name":"Updated Rule"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/auto-reply/rules/{ar_id}")
    
    s, b, _ = api("POST", f"/api/auto-reply/rules/{ar_id}/test", {"message":"hello world"})
    log("PASS" if s == 200 else "FAIL", f"POST /api/auto-reply/rules/{ar_id}/test")
    
    s, b, _ = api("DELETE", f"/api/auto-reply/rules/{ar_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/auto-reply/rules/{ar_id}")

s, b, _ = api("GET", "/api/auto-reply/logs")
log("PASS" if s == 200 else "FAIL", f"GET /api/auto-reply/logs")

s, b, _ = api("POST", "/api/auto-reply/process", {"platform":"twitter","message":"Hello there","sender":"test_user","conversation_id":"conv_123"})
log("PASS" if s == 200 else "WARN" if s in (400, 503) else "FAIL", f"POST /api/auto-reply/process: {s}")

# ─── BOT RULES ───
section("BOT RULES")
s, b, _ = api("GET", "/api/bot-rules")
log("PASS" if s == 200 else "FAIL", f"GET /api/bot-rules")

s, b, _ = api("POST", "/api/bot-rules", {"name":"Audit Bot","trigger_type":"keyword","trigger_value":"spam","platform":"twitter","reply_content":"Stop spamming"})
bot_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/bot-rules (id={bot_id})")

if bot_id:
    s, b, _ = api("PUT", f"/api/bot-rules/{bot_id}", {"name":"Updated Bot"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/bot-rules/{bot_id}")
    
    s, b, _ = api("POST", f"/api/bot-rules/{bot_id}/test", {"message":"This is spam content"})
    log("PASS" if s == 200 else "FAIL", f"POST /api/bot-rules/{bot_id}/test")
    
    s, b, _ = api("DELETE", f"/api/bot-rules/{bot_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/bot-rules/{bot_id}")

s, b, _ = api("GET", "/api/bot-rules/logs")
log("PASS" if s == 200 else "FAIL", f"GET /api/bot-rules/logs")

# ─── INFLUENCERS ───
section("INFLUENCERS")
s, b, _ = api("GET", "/api/influencers")
log("PASS" if s == 200 else "FAIL", f"GET /api/influencers")

s, b, _ = api("POST", "/api/influencers", {"name":"Test Influencer","platform":"instagram","handle":"test_user"})
inf_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/influencers (id={inf_id})")

if inf_id:
    s, b, _ = api("GET", f"/api/influencers/{inf_id}")
    log("PASS" if s == 200 else "FAIL", f"GET /api/influencers/{inf_id}")
    
    s, b, _ = api("PUT", f"/api/influencers/{inf_id}", {"name":"Updated Influencer"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/influencers/{inf_id}")
    
    s, b, _ = api("DELETE", f"/api/influencers/{inf_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/influencers/{inf_id}")

# Search
s, b, _ = api("GET", "/api/influencers/search?q=test")
log("PASS" if s == 200 else "FAIL", f"GET /api/influencers/search")

# ─── INFLUENCER CAMPAIGNS ───
section("INFLUENCER CAMPAIGNS")
s, b, _ = api("GET", "/api/influencer-campaigns")
log("PASS" if s == 200 else "FAIL", f"GET /api/influencer-campaigns")

s, b, _ = api("POST", "/api/influencer-campaigns", {"name":"Inf Campaign","description":"Test"})
ic_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/influencer-campaigns (id={ic_id})")

if ic_id:
    s, b, _ = api("GET", f"/api/influencer-campaigns/{ic_id}")
    log("PASS" if s == 200 else "FAIL", f"GET /api/influencer-campaigns/{ic_id}")
    
    s, b, _ = api("PUT", f"/api/influencer-campaigns/{ic_id}", {"name":"Updated Inf Campaign"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/influencer-campaigns/{ic_id}")
    
    # Members
    s, b, _ = api("POST", f"/api/influencer-campaigns/{ic_id}/members", {"influencer_id":inf_id if inf_id else 1,"role":"creator"})
    member_id = b.get("id") if s == 200 else None
    log("PASS" if s == 200 else "FAIL", f"POST /api/influencer-campaigns/{ic_id}/members (id={member_id})")
    
    if member_id:
        s, b, _ = api("PUT", f"/api/influencer-campaigns/members/{member_id}/status", {"status":"approved"})
        log("PASS" if s == 200 else "FAIL", f"PUT /api/influencer-campaigns/members/{member_id}/status")
        s, b, _ = api("DELETE", f"/api/influencer-campaigns/members/{member_id}")
        log("PASS" if s == 200 else "FAIL", f"DELETE /api/influencer-campaigns/members/{member_id}")
    
    # Content
    s, b, _ = api("POST", f"/api/influencer-campaigns/{ic_id}/content", {"influencer_id":inf_id if inf_id else 1,"content":"Check this out!","platform":"instagram"})
    cont_id = b.get("id") if s == 200 else None
    log("PASS" if s == 200 else "FAIL", f"POST /api/influencer-campaigns/{ic_id}/content (id={cont_id})")
    
    if cont_id:
        s, b, _ = api("PUT", f"/api/influencer-campaigns/content/{cont_id}", {"content":"Updated content"})
        log("PASS" if s == 200 else "FAIL", f"PUT /api/influencer-campaigns/content/{cont_id}")
        
        s, b, _ = api("PUT", f"/api/influencer-campaigns/content/{cont_id}/status", {"status":"approved"})
        log("PASS" if s == 200 else "FAIL", f"PUT /api/influencer-campaigns/content/{cont_id}/status")
        
        s, b, _ = api("DELETE", f"/api/influencer-campaigns/content/{cont_id}")
        log("PASS" if s == 200 else "FAIL", f"DELETE /api/influencer-campaigns/content/{cont_id}")
    
    s, b, _ = api("DELETE", f"/api/influencer-campaigns/{ic_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/influencer-campaigns/{ic_id}")

# ─── LISTENING ───
section("LISTENING")
s, b, _ = api("GET", "/api/listening/topics")
log("PASS" if s == 200 else "FAIL", f"GET /api/listening/topics")

s, b, _ = api("POST", "/api/listening/topics", {"keyword":"socialpulses","platform":"twitter"})
lt_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/listening/topics (id={lt_id})")

if lt_id:
    s, b, _ = api("PUT", f"/api/listening/topics/{lt_id}", {"keyword":"socialpulses_updated"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/listening/topics/{lt_id}")
    
    s, b, _ = api("GET", f"/api/listening/topics/{lt_id}/mentions")
    log("PASS" if s == 200 else "FAIL", f"GET /api/listening/topics/{lt_id}/mentions")
    
    s, b, _ = api("GET", f"/api/listening/topics/{lt_id}/dashboard")
    log("PASS" if s == 200 else "FAIL", f"GET /api/listening/topics/{lt_id}/dashboard")
    
    s, b, _ = api("POST", f"/api/listening/topics/{lt_id}/mentions", {"content":"Test mention","platform":"twitter","author":"test_user"})
    ment_id = b.get("id") if s == 200 else None
    log("PASS" if s == 200 else "FAIL", f"POST /api/listening/topics/{lt_id}/mentions (id={ment_id})")
    
    if ment_id:
        s, b, _ = api("DELETE", f"/api/listening/mentions/{ment_id}")
        log("PASS" if s == 200 else "FAIL", f"DELETE /api/listening/mentions/{ment_id}")
    
    s, b, _ = api("POST", f"/api/listening/topics/{lt_id}/scan")
    log("PASS" if s == 200 else "FAIL", f"POST /api/listening/topics/{lt_id}/scan")
    
    s, b, _ = api("DELETE", f"/api/listening/topics/{lt_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/listening/topics/{lt_id}")

s, b, _ = api("GET", "/api/listening/dashboard")
log("PASS" if s == 200 else "FAIL", f"GET /api/listening/dashboard")

# ─── REPORTS ───
section("REPORTS")
s, b, _ = api("GET", "/api/reports/summary")
log("PASS" if s == 200 else "FAIL", f"GET /api/reports/summary")

s, b, _ = api("GET", "/api/reports/premium")
log("PASS" if s == 200 else "FAIL", f"GET /api/reports/premium")

s, b, _ = api("GET", "/api/reports/premium/chart-data")
log("PASS" if s == 200 else "FAIL", f"GET /api/reports/premium/chart-data")

s, b, _ = api("GET", "/api/reports/export?format=pdf")
log("PASS" if s == 200 else "FAIL", f"GET /api/reports/export")

s, b, _ = api("GET", "/api/report-templates")
log("PASS" if s == 200 else "FAIL", f"GET /api/report-templates")

s, b, _ = api("POST", "/api/report-templates", {"name":"Audit Report","config":{"sections":["posts","engagement"]}})
rt_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/report-templates (id={rt_id})")

if rt_id:
    s, b, _ = api("PUT", f"/api/report-templates/{rt_id}", {"name":"Updated Report"})
    log("PASS" if s == 200 else "FAIL", f"PUT /api/report-templates/{rt_id}")
    
    s, b, _ = api("POST", f"/api/report-templates/{rt_id}/generate")
    log("PASS" if s == 200 else "FAIL", f"POST /api/report-templates/{rt_id}/generate")
    
    s, b, _ = api("DELETE", f"/api/report-templates/{rt_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/report-templates/{rt_id}")

s, b, _ = api("GET", "/api/reports/shared")
log("PASS" if s == 200 else "FAIL", f"GET /api/reports/shared")

# ─── SUBSCRIPTION / BILLING ───
section("SUBSCRIPTION / BILLING")
s, b, _ = api("GET", "/api/stripe/config")
log("PASS" if s == 200 else "FAIL", f"GET /api/stripe/config")

s, b, _ = api("GET", "/api/subscription")
log("PASS" if s == 200 else "FAIL", f"GET /api/subscription")

s, b, _ = api("GET", "/api/subscription/check")
log("PASS" if s == 200 else "FAIL", f"GET /api/subscription/check")

s, b, _ = api("GET", "/api/subscription/features")
log("PASS" if s == 200 else "FAIL", f"GET /api/subscription/features")

s, b, _ = api("GET", "/api/subscription/invoices")
log("PASS" if s == 200 else "FAIL", f"GET /api/subscription/invoices")

s, b, _ = api("GET", "/api/streaks")
log("PASS" if s == 200 else "FAIL", f"GET /api/streaks: {s}")

# ─── API KEYS ───
section("API KEYS")
s, b, _ = api("GET", "/api/account/api-keys")
log("PASS" if s == 200 else "FAIL", f"GET /api/account/api-keys")

s, b, _ = api("POST", "/api/account/api-keys", {"name":"Audit Key"})
ak_id = b.get("id") if s == 200 else None
log("PASS" if s == 200 else "FAIL", f"POST /api/account/api-keys (id={ak_id})")

if ak_id:
    s, b, _ = api("DELETE", f"/api/account/api-keys/{ak_id}")
    log("PASS" if s == 200 else "FAIL", f"DELETE /api/account/api-keys/{ak_id}")

# ─── V1 PUBLIC API ───
section("V1 PUBLIC API")
s, b, _ = api("GET", "/api/v1/posts")
log("PASS" if s == 200 else "FAIL", f"GET /api/v1/posts")

s, b, _ = api("GET", "/api/v1/accounts")
log("PASS" if s == 200 else "FAIL", f"GET /api/v1/accounts")

s, b, _ = api("GET", "/api/v1/analytics")
log("PASS" if s == 200 else "FAIL", f"GET /api/v1/analytics")

s, b, _ = api("POST", "/api/v1/posts", {"content":"V1 API post","platforms":["twitter"]})
log("PASS" if s == 200 else "FAIL", f"POST /api/v1/posts")

# ─── SETTINGS ───
section("SETTINGS")
s, b, _ = api("GET", "/api/settings")
log("PASS" if s == 200 else "FAIL", f"GET /api/settings")

s, b, _ = api("GET", "/api/settings/platform-credentials")
log("PASS" if s == 200 else "FAIL", f"GET /api/settings/platform-credentials")

# ─── ORGANIZATIONS ───
section("ORGANIZATIONS")
s, b, _ = api("GET", "/api/orgs")
log("PASS" if s == 200 else "FAIL", f"GET /api/orgs")

# ─── PROFILE ───
section("PROFILE")
s, b, _ = api("GET", "/api/profile")
log("PASS" if s == 200 else "FAIL", f"GET /api/profile")

s, b, _ = api("PUT", "/api/profile", {"display_name":"Audit User","company":"Audit Inc"})
log("PASS" if s == 200 else "FAIL", f"PUT /api/profile")

# ─── OAUTH URL GENERATION ───
section("OAUTH URL GENERATION")
for platform in ["twitter","facebook","instagram","tiktok","youtube","pinterest","linkedin","threads","bluesky","telegram","google_business","mastodon"]:
    s, b, _ = api("GET", f"/api/oauth/{platform}/url")
    if s == 200:
        log("PASS", f"GET /api/oauth/{platform}/url - URL generated")
    elif s == 400:
        log("WARN", f"GET /api/oauth/{platform}/url - 400: not configured")
    elif s == 401:
        log("FAIL", f"GET /api/oauth/{platform}/url - 401: auth issue")
    elif s == 500:
        err_str = str(b)[:80]
        log("FAIL", f"GET /api/oauth/{platform}/url - 500: {err_str}")
    else:
        log("FAIL", f"GET /api/oauth/{platform}/url: {s}")

# ─── ERROR HANDLING ───
section("ERROR HANDLING")
s, b, _ = api("GET", "/api/nonexistent-route-xyz")
log("PASS" if s == 404 else "FAIL", f"Bad route returns {s} (expect 404)")

old_tok = TOKEN
TOKEN = None
s, b, _ = api("GET", "/api/posts")
log("PASS" if s in (401, 403) else "FAIL", f"No auth returns {s} (expect 401/403)")
TOKEN = old_tok

# ─── HEALTH ───
section("HEALTH")
s, b, _ = api("GET", "/api/health")
log("PASS" if s == 200 else "FAIL", f"GET /api/health")

# ─── TELEGRAM WEBHOOK ───
section("WEBHOOK ENDPOINTS")
s, b, _ = api("POST", "/api/telegram/webhook", {"message":{"text":"test","chat":{"id":1}}})
log("PASS" if s in (200, 422, 400) else "FAIL", f"POST /api/telegram/webhook: {s}")

s, b, _ = api("POST", "/api/webhooks/tiktok", {"event":"test"})
log("PASS" if s in (200, 400) else "FAIL", f"POST /api/webhooks/tiktok: {s}")

# ─── SUMMARY ───
section("AUDIT SUMMARY")
total = RESULTS["total"]
passed = RESULTS["passed"]
failed = RESULTS["failed"]
warns = RESULTS["warnings"]
print(f"\n  Total tests: {total}")
print(f"  Passed:      {passed}")
print(f"  Failed:      {failed}")
print(f"  Warnings:    {warns}")
print(f"  Pass rate:   {passed/max(total,1)*100:.1f}%")

with open("/tmp/audit_results_v2.json", "w") as f:
    json.dump(RESULTS, f, indent=2, default=str)
print(f"\n  Results: /tmp/audit_results_v2.json")
