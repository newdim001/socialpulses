#!/usr/bin/env python3
"""
SocialPulses Comprehensive Backend/Functionality Audit
Tests all API endpoints, business logic, error handling, and more.
"""
import sys
import os
import json
import time
import sqlite3
import subprocess
import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

BASE = "http://localhost:8007"
TOKEN = None
CLIENT_ID = None
RESULTS = {
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "warnings": 0,
    "details": []
}

def log_pass(msg):
    RESULTS["passed"] += 1
    RESULTS["total_tests"] += 1
    RESULTS["details"].append({"status": "PASS", "msg": msg})
    print(f"  ✓ {msg}")

def log_fail(msg):
    RESULTS["failed"] += 1
    RESULTS["total_tests"] += 1
    RESULTS["details"].append({"status": "FAIL", "msg": msg})
    print(f"  ✗ {msg}")

def log_warn(msg):
    RESULTS["warnings"] += 1
    RESULTS["total_tests"] += 1
    RESULTS["details"].append({"status": "WARN", "msg": msg})
    print(f"  ⚠ {msg}")

def section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def api(method, path, data=None, files=None, expect_status=None):
    """Make API call and return (status_code, body)"""
    import urllib.request
    import urllib.error
    
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    
    if files:
        # multipart upload
        import http.client
        import io
        boundary = "----WebKitFormBoundary" + os.urandom(16).hex()
        body = b""
        for k, v in files.items():
            body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{v[0]}\"\r\nContent-Type: {v[2]}\r\n\r\n".encode()
            if isinstance(v[1], str):
                body += v[1].encode()
            else:
                body += v[1]
            body += b"\r\n"
        if data:
            for k, v in data.items():
                if isinstance(v, str):
                    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
                else:
                    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{json.dumps(v)}\r\n".encode()
        body += f"--{boundary}--\r\n".encode()
        
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Authorization", f"Bearer {TOKEN}")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    elif data is not None:
        body = json.dumps(data).encode()
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", "application/json")
        if TOKEN:
            req.add_header("Authorization", f"Bearer {TOKEN}")
    else:
        req = urllib.request.Request(url, method=method)
        if TOKEN:
            req.add_header("Authorization", f"Bearer {TOKEN}")
    
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        body_raw = resp.read()
        status = resp.status
        try:
            body = json.loads(body_raw)
        except:
            body = body_raw.decode()
        if expect_status is not None and status != expect_status:
            log_fail(f"Expected status {expect_status}, got {status} for {method} {path}")
        return (status, body, None)
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            body = json.loads(e.read())
        except:
            body = str(e)
        if expect_status is not None and status != expect_status:
            log_fail(f"Expected status {expect_status}, got {status} for {method} {path}: {body}")
        return (status, body, str(e))
    except Exception as e:
        log_fail(f"Exception calling {method} {path}: {e}")
        return (None, None, str(e))

# ─── SETUP TEST USER ───
section("SETUP: Creating test user in database")

DB_PATH = "/Users/suren/socialpulses/data/socialpulses.db"
import bcrypt
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if sam@test.com exists
cursor.execute("SELECT id FROM users WHERE username = 'sam@test.com'")
if cursor.fetchone():
    print("  Test user sam@test.com already exists")
else:
    # Get or create client
    cursor.execute("SELECT id FROM clients WHERE email = 'sam@test.com'")
    row = cursor.fetchone()
    if row:
        client_id = row[0]
    else:
        cursor.execute("SELECT id FROM organizations LIMIT 1")
        org_row = cursor.fetchone()
        org_id = org_row[0] if org_row else None
        if not org_id:
            cursor.execute("INSERT INTO organizations (name, slug) VALUES ('Test Org', 'test')")
            org_id = cursor.lastrowid
        cursor.execute("INSERT INTO clients (name, email, org_id) VALUES ('Sam', 'sam@test.com', ?)", (org_id,))
        client_id = cursor.lastrowid
    
    pw_hash = bcrypt.hashpw('Dxb@2026'.encode(), bcrypt.gensalt(rounds=12)).decode()
    cursor.execute("INSERT INTO users (username, password_hash, role, client_id) VALUES (?, ?, 'admin', ?)",
                   ('sam@test.com', pw_hash, client_id))
    print("  ✓ Created test user sam@test.com")

conn.commit()
conn.close()

# ─── AUTH ───
section("1. AUTH ENDPOINTS")

# Login
status, body, err = api("POST", "/api/auth/login", {"username":"sam@test.com","password":"Dxb@2026"})
if status == 200 and "token" in body:
    TOKEN = body["token"]
    CLIENT_ID = body.get("client_id")
    log_pass("POST /api/auth/login - Successful login, got token")
else:
    log_fail(f"POST /api/auth/login - Expected 200, got {status}: {body}")

# Auth check
status, body, _ = api("GET", "/api/auth/check")
log_pass("GET /api/auth/check" if status == 200 else log_fail(f"GET /api/auth/check: {status}"))

# Me
status, body, _ = api("GET", "/api/auth/me")
if status == 200:
    log_pass("GET /api/auth/me")
else:
    log_fail(f"GET /api/auth/me: {status}: {body}")

# Login wrong password
status, body, _ = api("POST", "/api/auth/login", {"username":"sam@test.com","password":"wrongpass"})
if status == 401:
    log_pass("POST /api/auth/login - Wrong password returns 401")
else:
    log_fail(f"POST /api/auth/login wrong password: expected 401, got {status}")

# Login missing username
status, body, _ = api("POST", "/api/auth/login", {"password":"Dxb@2026"})
if status == 422:
    log_pass("POST /api/auth/login - Missing username returns 422")
else:
    log_fail(f"POST /api/auth/login missing username: expected 422, got {status}")

# Signup - duplicate
status, body, _ = api("POST", "/api/auth/signup", {"email":"sam@test.com","password":"Test1234!","name":"Sam"})
if status == 400:
    log_pass("POST /api/auth/signup - Duplicate email returns 400")
else:
    log_fail(f"POST /api/auth/signup duplicate: expected 400, got {status}")

# Profile
status, body, _ = api("GET", "/api/profile")
if status == 200:
    log_pass("GET /api/profile")
else:
    log_fail(f"GET /api/profile: {status}")

# Change password
status, body, _ = api("POST", "/api/auth/change-password", {"current_password":"Dxb@2026","new_password":"Dxb@2027"})
if status == 200:
    # Change back
    api("POST", "/api/auth/change-password", {"current_password":"Dxb@2027","new_password":"Dxb@2026"})
    log_pass("POST /api/auth/change-password")
else:
    log_fail(f"POST /api/auth/change-password: {status}: {body}")

# ─── PLATFORMS & ACCOUNTS ───
section("2. PLATFORMS & ACCOUNTS")

status, body, _ = api("GET", "/api/platforms")
if status == 200 and isinstance(body, list):
    log_pass(f"GET /api/platforms - {len(body)} platforms")
else:
    log_fail(f"GET /api/platforms: {status}")

status, body, _ = api("GET", "/api/accounts")
if status == 200:
    log_pass(f"GET /api/accounts - {len(body) if isinstance(body, list) else 'ok'}")
else:
    log_fail(f"GET /api/accounts: {status}")

# ─── CLIENTS ───
section("3. CLIENTS")

status, body, _ = api("GET", "/api/clients")
if status == 200:
    log_pass(f"GET /api/clients - {len(body) if isinstance(body, list) else 'ok'}")
else:
    log_fail(f"GET /api/clients: {status}")

# ─── POSTS ───
section("4. POSTS CRUD")

# Create a post
status, body, _ = api("POST", "/api/posts", {
    "content": "Test post from comprehensive audit",
    "platforms": ["twitter"],
    "scheduled_at": None
})
post_id = None
if status == 200:
    post_id = body.get("id")
    log_pass(f"POST /api/posts - Created post {post_id}")
else:
    log_fail(f"POST /api/posts: {status}: {body}")

# List posts
status, body, _ = api("GET", "/api/posts")
if status == 200:
    log_pass(f"GET /api/posts - {len(body) if isinstance(body, list) else 'ok'}")
else:
    log_fail(f"GET /api/posts: {status}")

# Get single post
if post_id:
    status, body, _ = api("GET", f"/api/posts/{post_id}")
    if status == 200:
        log_pass(f"GET /api/posts/{post_id}")
    else:
        log_fail(f"GET /api/posts/{post_id}: {status}")

# Update post
if post_id:
    status, body, _ = api("PUT", f"/api/posts/{post_id}", {"content":"Updated test content"})
    if status == 200:
        log_pass(f"PUT /api/posts/{post_id}")
    else:
        log_fail(f"PUT /api/posts/{post_id}: {status}: {body}")

# Schedule post
if post_id:
    future = (datetime.datetime.utcnow() + datetime.timedelta(hours=48)).isoformat()
    status, body, _ = api("PUT", f"/api/posts/{post_id}", {"content":"Scheduled post", "scheduled_at": future})
    if status == 200:
        log_pass("PUT /api/posts - Schedule post")
    else:
        log_fail(f"PUT /api/posts schedule: {status}: {body}")

# Duplicate post
if post_id:
    status, body, _ = api("POST", f"/api/posts/{post_id}/duplicate")
    if status == 200:
        log_pass(f"POST /api/posts/{post_id}/duplicate")
    else:
        log_fail(f"POST /api/posts/{post_id}/duplicate: {status}: {body}")

# Pending approval
status, body, _ = api("GET", "/api/posts/pending-approval")
if status == 200:
    log_pass("GET /api/posts/pending-approval")
else:
    log_fail(f"GET /api/posts/pending-approval: {status}")

# Approve/reject
if post_id:
    api("PUT", f"/api/posts/{post_id}/approve")

# Delete post
if post_id:
    status, body, _ = api("DELETE", f"/api/posts/{post_id}")
    if status == 200:
        log_pass(f"DELETE /api/posts/{post_id}")
    else:
        log_fail(f"DELETE /api/posts/{post_id}: {status}: {body}")

# Get deleted post - should 404
if post_id:
    status, body, _ = api("GET", f"/api/posts/{post_id}")
    if status == 404:
        log_pass("GET /api/posts/{deleted_id} returns 404")
    else:
        log_fail(f"GET deleted post: expected 404, got {status}")

# ─── MEDIA ───
section("5. MEDIA UPLOAD")

# Create a small test image
test_img_path = "/tmp/test_audit_image.png"
subprocess.run(["python3", "-c", f"""
from PIL import Image
img = Image.new('RGB', (100, 100), color='red')
img.save('{test_img_path}')
"""], capture_output=True)

with open(test_img_path, "rb") as f:
    img_data = f.read()

import urllib.request
boundary = "----Boundary" + os.urandom(16).hex()
body = b""
body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.png\"\r\nContent-Type: image/png\r\n\r\n".encode()
body += img_data
body += f"\r\n--{boundary}--\r\n".encode()

req = urllib.request.Request(f"{BASE}/api/media/upload", data=body, method="POST")
req.add_header("Authorization", f"Bearer {TOKEN}")
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

try:
    resp = urllib.request.urlopen(req, timeout=15)
    media_body = json.loads(resp.read())
    media_id = media_body.get("id")
    log_pass(f"POST /api/media/upload - Uploaded media {media_id}")
except urllib.error.HTTPError as e:
    try:
        err_body = json.loads(e.read())
    except:
        err_body = str(e)
    log_fail(f"POST /api/media/upload: {e.code}: {err_body}")
    media_id = None

# List media
status, body, _ = api("GET", "/api/media")
if status == 200:
    log_pass(f"GET /api/media - {len(body) if isinstance(body, list) else 'ok'}")
else:
    log_fail(f"GET /api/media: {status}")

# Media folders
status, body, _ = api("GET", "/api/media/folders")
if status == 200:
    log_pass("GET /api/media/folders")
else:
    log_fail(f"GET /api/media/folders: {status}")

# Create folder
status, body, _ = api("POST", "/api/media/folders", {"name":"Test Folder"})
folder_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/media/folders - Created {folder_id}")
else:
    log_fail(f"POST /api/media/folders: {status}: {body}")

# Delete folder
if folder_id:
    api("DELETE", f"/api/media/folders/{folder_id}")

# ─── DASHBOARD ───
section("6. DASHBOARD & ANALYTICS")

status, body, _ = api("GET", "/api/dashboard")
if status == 200:
    log_pass("GET /api/dashboard")
else:
    log_fail(f"GET /api/dashboard: {status}")

status, body, _ = api("GET", "/api/calendar")
if status == 200:
    log_pass("GET /api/calendar")
else:
    log_fail(f"GET /api/calendar: {status}")

status, body, _ = api("GET", "/api/analytics/summary")
if status == 200:
    log_pass("GET /api/analytics/summary")
else:
    log_fail(f"GET /api/analytics/summary: {status}")

status, body, _ = api("GET", "/api/analytics/calendar-heatmap")
if status == 200:
    log_pass("GET /api/analytics/calendar-heatmap")
else:
    log_fail(f"GET /api/analytics/calendar-heatmap: {status}")

status, body, _ = api("GET", "/api/analytics/best-time")
if status == 200:
    log_pass("GET /api/analytics/best-time")
else:
    log_fail(f"GET /api/analytics/best-time: {status}")

status, body, _ = api("GET", "/api/analytics/competitive")
if status == 200:
    log_pass("GET /api/analytics/competitive")
else:
    log_fail(f"GET /api/analytics/competitive: {status}")

status, body, _ = api("GET", "/api/analytics/timeline")
if status == 200:
    log_pass("GET /api/analytics/timeline")
else:
    log_fail(f"GET /api/analytics/timeline: {status}")

# ─── AI ENDPOINTS ───
section("7. AI ENDPOINTS")

status, body, _ = api("POST", "/api/ai/generate", {"prompt":"Write a tweet about AI","platform":"twitter","tone":"professional"})
if status == 200:
    log_pass("POST /api/ai/generate")
elif status == 503:
    log_warn("POST /api/ai/generate - Service unavailable (maybe no API key)")
else:
    log_fail(f"POST /api/ai/generate: {status}: {body}")

status, body, _ = api("POST", "/api/ai/content-ideas", {"topic":"technology","count":3})
if status in (200, 503):
    log_pass("POST /api/ai/content-ideas" if status == 200 else log_warn("POST /api/ai/content-ideas - Service unavailable"))
else:
    log_fail(f"POST /api/ai/content-ideas: {status}")

status, body, _ = api("POST", "/api/ai/variations", {"content":"Original post content here"})
if status in (200, 503):
    log_pass("POST /api/ai/variations" if status == 200 else log_warn("POST /api/ai/variations - Service unavailable"))
else:
    log_fail(f"POST /api/ai/variations: {status}")

status, body, _ = api("POST", "/api/ai/best-time", {"platform":"instagram"})
if status in (200, 503):
    log_pass("POST /api/ai/best-time" if status == 200 else log_warn("POST /api/ai/best-time - Service unavailable"))
else:
    log_fail(f"POST /api/ai/best-time: {status}")

status, body, _ = api("POST", "/api/ai/repurpose", {"content":"Blog post content here","target_platform":"twitter"})
if status in (200, 503):
    log_pass("POST /api/ai/repurpose" if status == 200 else log_warn("POST /api/ai/repurpose - Service unavailable"))
else:
    log_fail(f"POST /api/ai/repurpose: {status}")

# ─── BULK POSTS ───
section("8. BULK POSTS")

status, body, _ = api("POST", "/api/posts/bulk", {
    "posts": [
        {"content": "Bulk post 1", "platforms": ["twitter"]},
        {"content": "Bulk post 2", "platforms": ["linkedin"]}
    ]
})
if status == 200:
    log_pass("POST /api/posts/bulk")
else:
    log_fail(f"POST /api/posts/bulk: {status}: {body}")

# ─── SAVED REPLIES ───
section("9. SAVED REPLIES")

status, body, _ = api("GET", "/api/saved-replies")
if status == 200:
    log_pass("GET /api/saved-replies")
else:
    log_fail(f"GET /api/saved-replies: {status}")

status, body, _ = api("POST", "/api/saved-replies", {"title":"Thanks!","content":"Thanks for your message!","platform":"twitter"})
saved_reply_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/saved-replies - Created {saved_reply_id}")
else:
    log_fail(f"POST /api/saved-replies: {status}: {body}")

if saved_reply_id:
    api("DELETE", f"/api/saved-replies/{saved_reply_id}")

# ─── POST TEMPLATES ───
section("10. POST TEMPLATES")

status, body, _ = api("GET", "/api/post-templates")
if status == 200:
    log_pass("GET /api/post-templates")
else:
    log_fail(f"GET /api/post-templates: {status}")

status, body, _ = api("POST", "/api/post-templates", {"name":"Test Template","content":"Template content {variable}","platform":"twitter"})
tmpl_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/post-templates - Created {tmpl_id}")
else:
    log_fail(f"POST /api/post-templates: {status}: {body}")

if tmpl_id:
    api("DELETE", f"/api/post-templates/{tmpl_id}")

# ─── RSS FEEDS ───
section("11. RSS FEEDS")

status, body, _ = api("GET", "/api/rss-feeds")
if status == 200:
    log_pass("GET /api/rss-feeds")
else:
    log_fail(f"GET /api/rss-feeds: {status}")

# ─── HASHTAG GROUPS ───
section("12. HASHTAG GROUPS")

status, body, _ = api("GET", "/api/hashtag-groups")
if status == 200:
    log_pass("GET /api/hashtag-groups")
else:
    log_fail(f"GET /api/hashtag-groups: {status}")

status, body, _ = api("POST", "/api/hashtags/groups", {"name":"Tech","hashtags":"#AI #ML #Tech"})
hg_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/hashtags/groups - Created {hg_id}")
else:
    log_fail(f"POST /api/hashtags/groups: {status}: {body}")

if hg_id:
    api("DELETE", f"/api/hashtags/groups/{hg_id}")

# ─── LINK-IN-BIO ───
section("13. LINK-IN-BIO")

status, body, _ = api("GET", "/api/link-bio")
if status == 200:
    log_pass("GET /api/link-bio")
else:
    log_fail(f"GET /api/link-bio: {status}")

status, body, _ = api("POST", "/api/link-bio", {"title":"My Links","username":"samslinks"})
lb_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/link-bio - Created {lb_id}")
else:
    log_fail(f"POST /api/link-bio: {status}: {body}")

if lb_id:
    status, body, _ = api("POST", f"/api/link-bio/{lb_id}/links", {"title":"My Site","url":"https://example.com"})
    if status == 200:
        log_pass(f"POST /api/link-bio/{lb_id}/links")
    api("DELETE", f"/api/link-bio/{lb_id}")

# ─── UTM TEMPLATES ───
section("14. UTM TEMPLATES")

status, body, _ = api("GET", "/api/utm-templates")
if status == 200:
    log_pass("GET /api/utm-templates")
else:
    log_fail(f"GET /api/utm-templates: {status}")

status, body, _ = api("POST", "/api/utm-templates", {"name":"Campaign","source":"social","medium":"social","campaign":"spring_sale"})
utm_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/utm-templates - Created {utm_id}")
else:
    log_fail(f"POST /api/utm-templates: {status}: {body}")

if utm_id:
    api("DELETE", f"/api/utm-templates/{utm_id}")

# ─── CAMPAIGNS ───
section("15. CAMPAIGNS")

status, body, _ = api("GET", "/api/campaigns")
if status == 200:
    log_pass("GET /api/campaigns")
else:
    log_fail(f"GET /api/campaigns: {status}")

status, body, _ = api("POST", "/api/campaigns", {"name":"Test Campaign","description":"Testing"})
camp_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/campaigns - Created {camp_id}")
else:
    log_fail(f"POST /api/campaigns: {status}: {body}")

if camp_id:
    # Add phase
    status, body, _ = api("POST", f"/api/campaigns/{camp_id}/phases", {"name":"Phase 1","order":1})
    phase_id = body.get("id") if status == 200 else None
    if status == 200:
        log_pass(f"POST /api/campaigns/{camp_id}/phases - Created {phase_id}")
    
    # Get phases
    status, body, _ = api("GET", f"/api/campaigns/{camp_id}/phases")
    if status == 200:
        log_pass(f"GET /api/campaigns/{camp_id}/phases")
    
    if phase_id:
        api("DELETE", f"/api/campaigns/phases/{phase_id}")
    
    api("DELETE", f"/api/campaigns/{camp_id}")

# ─── SPIKE ALERTS ───
section("16. SPIKE ALERTS")

status, body, _ = api("GET", "/api/spike-alerts")
if status == 200:
    log_pass("GET /api/spike-alerts")
else:
    log_fail(f"GET /api/spike-alerts: {status}")

status, body, _ = api("POST", "/api/spike-alerts", {"keyword":"test","threshold":10})
spike_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/spike-alerts - Created {spike_id}")
else:
    log_fail(f"POST /api/spike-alerts: {status}: {body}")

if spike_id:
    api("DELETE", f"/api/spike-alerts/{spike_id}")

status, body, _ = api("GET", "/api/spike-alerts/events")
if status == 200:
    log_pass("GET /api/spike-alerts/events")
else:
    log_fail(f"GET /api/spike-alerts/events: {status}")

status, body, _ = api("POST", "/api/spike-alerts/check", {"text":"Check this test content for spikes"})
if status == 200:
    log_pass("POST /api/spike-alerts/check")
else:
    log_fail(f"POST /api/spike-alerts/check: {status}: {body}")

# ─── SENTIMENT ───
section("17. SENTIMENT")

status, body, _ = api("GET", "/api/analytics/sentiment")
if status == 200:
    log_pass("GET /api/analytics/sentiment")
else:
    log_fail(f"GET /api/analytics/sentiment: {status}")

# ─── INBOX ───
section("18. INBOX")

status, body, _ = api("GET", "/api/inbox/conversations")
if status == 200:
    log_pass("GET /api/inbox/conversations")
else:
    log_fail(f"GET /api/inbox/conversations: {status}")

status, body, _ = api("POST", "/api/inbox/conversations", {"platform":"twitter","platform_user_id":"12345","platform_username":"testuser","content":"Hello from test!"})
conv_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/inbox/conversations - Created {conv_id}")
else:
    log_fail(f"POST /api/inbox/conversations: {status}: {body}")

if conv_id:
    status, body, _ = api("POST", f"/api/inbox/conversations/{conv_id}/reply", {"content":"Test reply"})
    if status == 200:
        log_pass(f"POST /api/inbox/conversations/{conv_id}/reply")
    else:
        log_warn(f"POST /api/inbox/conversations/{conv_id}/reply: {status}")
    
    api("DELETE", f"/api/inbox/conversations/{conv_id}")

# ─── KANBAN ───
section("19. KANBAN")

status, body, _ = api("GET", "/api/kanban/columns")
if status == 200:
    log_pass("GET /api/kanban/columns")
else:
    log_fail(f"GET /api/kanban/columns: {status}")

status, body, _ = api("GET", "/api/kanban/cards")
if status == 200:
    log_pass("GET /api/kanban/cards")
else:
    log_fail(f"GET /api/kanban/cards: {status}")

# ─── NOTIFICATIONS ───
section("20. NOTIFICATIONS")

status, body, _ = api("GET", "/api/notifications")
if status == 200:
    log_pass("GET /api/notifications")
else:
    log_fail(f"GET /api/notifications: {status}")

status, body, _ = api("GET", "/api/notifications/count")
if status == 200:
    log_pass("GET /api/notifications/count")
else:
    log_fail(f"GET /api/notifications/count: {status}")

# ─── RECURRING ───
section("21. RECURRING")

status, body, _ = api("GET", "/api/recurring/slots")
if status == 200:
    log_pass("GET /api/recurring/slots")
else:
    log_fail(f"GET /api/recurring/slots: {status}")

status, body, _ = api("POST", "/api/recurring/slots", {"day_of_week":1,"time":"10:00"})
slot_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/recurring/slots - Created {slot_id}")
else:
    log_fail(f"POST /api/recurring/slots: {status}: {body}")

if slot_id:
    api("DELETE", f"/api/recurring/slots/{slot_id}")

# ─── RSS ───
section("22. RSS FEED ITEMS")

status, body, _ = api("GET", "/api/rss-feeds")
if status == 200:
    log_pass("GET /api/rss-feeds")
else:
    log_fail(f"GET /api/rss-feeds: {status}")

# ─── TAGS ───
section("23. TAGS")

status, body, _ = api("GET", "/api/tags")
if status == 200:
    log_pass("GET /api/tags")
else:
    log_fail(f"GET /api/tags: {status}")

status, body, _ = api("POST", "/api/tags", {"name":"test-tag","color":"#ff0000"})
tag_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/tags - Created {tag_id}")
else:
    log_fail(f"POST /api/tags: {status}: {body}")

if tag_id:
    api("DELETE", f"/api/tags/{tag_id}")

# ─── WEBHOOKS ───
section("24. WEBHOOKS")

status, body, _ = api("GET", "/api/webhooks")
if status == 200:
    log_pass("GET /api/webhooks")
else:
    log_fail(f"GET /api/webhooks: {status}")

status, body, _ = api("POST", "/api/webhooks", {"url":"https://example.com/hook","events":["post.published","post.failed"],"platform":"twitter"})
wh_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/webhooks - Created {wh_id}")
else:
    log_fail(f"POST /api/webhooks: {status}: {body}")

if wh_id:
    status, body, _ = api("POST", "/api/webhooks/test", {"webhook_id":wh_id,"event_type":"post.published"})
    if status == 200:
        log_pass(f"POST /api/webhooks/test - Webhook test sent")
    else:
        log_fail(f"POST /api/webhooks/test: {status}: {body}")
    
    api("DELETE", f"/api/webhooks/{wh_id}")

status, body, _ = api("GET", "/api/webhooks/deliveries")
if status == 200:
    log_pass("GET /api/webhooks/deliveries")
else:
    log_fail(f"GET /api/webhooks/deliveries: {status}")

# ─── PUBLISHER ───
section("25. PUBLISHER")

status, body, _ = api("GET", "/api/publisher/status")
if status == 200:
    log_pass("GET /api/publisher/status")
else:
    log_fail(f"GET /api/publisher/status: {status}")

# ─── TRENDING SCANNER ───
section("26. TRENDING")

status, body, _ = api("GET", "/api/trending-scanner/status")
if status == 200:
    log_pass("GET /api/trending-scanner/status")
else:
    log_fail(f"GET /api/trending-scanner/status: {status}")

status, body, _ = api("GET", "/api/trending/topics")
if status == 200:
    log_pass("GET /api/trending/topics")
else:
    log_fail(f"GET /api/trending/topics: {status}")

# ─── AUTO-REPLY ───
section("27. AUTO-REPLY")

status, body, _ = api("GET", "/api/auto-reply/rules")
if status == 200:
    log_pass("GET /api/auto-reply/rules")
else:
    log_fail(f"GET /api/auto-reply/rules: {status}")

status, body, _ = api("GET", "/api/auto-reply-worker/status")
if status == 200:
    log_pass("GET /api/auto-reply-worker/status")
else:
    log_fail(f"GET /api/auto-reply-worker/status: {status}")

# ─── BOT RULES ───
section("28. BOT RULES")

status, body, _ = api("GET", "/api/bot-rules")
if status == 200:
    log_pass("GET /api/bot-rules")
else:
    log_fail(f"GET /api/bot-rules: {status}")

status, body, _ = api("GET", "/api/bot-rules/logs")
if status == 200:
    log_pass("GET /api/bot-rules/logs")
else:
    log_fail(f"GET /api/bot-rules/logs: {status}")

# ─── INFLUENCERS ───
section("29. INFLUENCERS")

status, body, _ = api("GET", "/api/influencers")
if status == 200:
    log_pass("GET /api/influencers")
else:
    log_fail(f"GET /api/influencers: {status}")

status, body, _ = api("GET", "/api/influencer-campaigns")
if status == 200:
    log_pass("GET /api/influencer-campaigns")
else:
    log_fail(f"GET /api/influencer-campaigns: {status}")

# ─── LISTENING ───
section("30. LISTENING")

status, body, _ = api("GET", "/api/listening/topics")
if status == 200:
    log_pass("GET /api/listening/topics")
else:
    log_fail(f"GET /api/listening/topics: {status}")

status, body, _ = api("GET", "/api/listening/dashboard")
if status == 200:
    log_pass("GET /api/listening/dashboard")
else:
    log_fail(f"GET /api/listening/dashboard: {status}")

# ─── REPORTS ───
section("31. REPORTS")

status, body, _ = api("GET", "/api/reports/summary")
if status == 200:
    log_pass("GET /api/reports/summary")
else:
    log_fail(f"GET /api/reports/summary: {status}")

status, body, _ = api("GET", "/api/reports/premium")
if status == 200:
    log_pass("GET /api/reports/premium")
else:
    log_fail(f"GET /api/reports/premium: {status}")

status, body, _ = api("GET", "/api/report-templates")
if status == 200:
    log_pass("GET /api/report-templates")
else:
    log_fail(f"GET /api/report-templates: {status}")

status, body, _ = api("GET", "/api/analytics/by-tag")
if status == 200:
    log_pass("GET /api/analytics/by-tag")
else:
    log_fail(f"GET /api/analytics/by-tag: {status}")

# ─── SUBSCRIPTIONS ───
section("32. SUBSCRIPTION / BILLING")

status, body, _ = api("GET", "/api/stripe/config")
if status == 200:
    log_pass("GET /api/stripe/config")
else:
    log_fail(f"GET /api/stripe/config: {status}")

status, body, _ = api("GET", "/api/subscription")
if status == 200:
    log_pass("GET /api/subscription")
else:
    log_fail(f"GET /api/subscription: {status}")

status, body, _ = api("GET", "/api/subscription/check")
if status == 200:
    log_pass("GET /api/subscription/check")
else:
    log_fail(f"GET /api/subscription/check: {status}")

status, body, _ = api("GET", "/api/subscription/features")
if status == 200:
    log_pass("GET /api/subscription/features")
else:
    log_fail(f"GET /api/subscription/features: {status}")

status, body, _ = api("GET", "/api/subscription/invoices")
if status == 200:
    log_pass("GET /api/subscription/invoices")
else:
    log_fail(f"GET /api/subscription/invoices: {status}")

status, body, _ = api("GET", "/api/streaks")
if status == 200:
    log_pass("GET /api/streaks")
else:
    log_fail(f"GET /api/streaks: {status}")

# ─── API KEYS ───
section("33. API KEYS")

status, body, _ = api("GET", "/api/account/api-keys")
if status == 200:
    log_pass("GET /api/account/api-keys")
else:
    log_fail(f"GET /api/account/api-keys: {status}")

status, body, _ = api("POST", "/api/account/api-keys", {"name":"Test Key"})
key_id = body.get("id") if status == 200 else None
if status == 200:
    log_pass(f"POST /api/account/api-keys - Created {key_id}")
else:
    log_fail(f"POST /api/account/api-keys: {status}: {body}")

if key_id:
    api("DELETE", f"/api/account/api-keys/{key_id}")

# ─── V1 API ───
section("34. V1 PUBLIC API")

status, body, _ = api("GET", "/api/v1/posts")
if status == 200:
    log_pass("GET /api/v1/posts")
else:
    log_fail(f"GET /api/v1/posts: {status}")

status, body, _ = api("GET", "/api/v1/accounts")
if status == 200:
    log_pass("GET /api/v1/accounts")
else:
    log_fail(f"GET /api/v1/accounts: {status}")

status, body, _ = api("GET", "/api/v1/analytics")
if status == 200:
    log_pass("GET /api/v1/analytics")
else:
    log_fail(f"GET /api/v1/analytics: {status}")

# ─── SETTINGS ───
section("35. SETTINGS")

status, body, _ = api("GET", "/api/settings")
if status == 200:
    log_pass("GET /api/settings")
else:
    log_fail(f"GET /api/settings: {status}")

status, body, _ = api("GET", "/api/settings/platform-credentials")
if status == 200:
    log_pass("GET /api/settings/platform-credentials")
else:
    log_fail(f"GET /api/settings/platform-credentials: {status}")

# ─── ORGANIZATIONS ───
section("36. ORGANIZATIONS")

status, body, _ = api("GET", "/api/orgs")
if status == 200:
    log_pass("GET /api/orgs")
else:
    log_fail(f"GET /api/orgs: {status}")

# ─── OAuth URLs ───
section("37. OAUTH URL GENERATION")

for platform in ["twitter", "facebook", "instagram", "tiktok", "youtube", "pinterest", "linkedin", "threads", "bluesky", "telegram", "google_business", "mastodon"]:
    status, body, _ = api("GET", f"/api/oauth/{platform}/url")
    if status == 200:
        log_pass(f"GET /api/oauth/{platform}/url")
    elif status == 400:
        log_pass(f"GET /api/oauth/{platform}/url - 400 (expected if not configured)")
    else:
        log_fail(f"GET /api/oauth/{platform}/url: {status}: {body}" if isinstance(body, str) else f"GET /api/oauth/{platform}/url: {status}: {str(body)[:100]}")

# ─── ERROR HANDLING TESTS ───
section("38. ERROR HANDLING")

# 404 routes
status, body, _ = api("GET", "/api/nonexistent-route-xyz")
if status == 404:
    log_pass("GET /api/nonexistent - 404 returned properly")
else:
    log_fail(f"GET /api/nonexistent: expected 404, got {status}")

# Unauthorized access
old_token = TOKEN
TOKEN = None
status, body, _ = api("GET", "/api/posts")
if status == 401 or status == 403:
    log_pass("GET /api/posts without auth - proper rejection ({status})")
else:
    log_fail(f"GET /api/posts without auth: expected 401/403, got {status}")
TOKEN = old_token

# ─── HEALTH ───
section("39. HEALTH")

status, body, _ = api("GET", "/api/health")
if status == 200:
    log_pass("GET /api/health")
else:
    log_fail(f"GET /api/health: {status}")

# ─── SUMMARY ───
section("AUDIT SUMMARY")
print(f"  Total tests: {RESULTS['total_tests']}")
print(f"  Passed:      {RESULTS['passed']}")
print(f"  Failed:      {RESULTS['failed']}")
print(f"  Warnings:    {RESULTS['warnings']}")
print(f"  Pass rate:   {RESULTS['passed']/max(RESULTS['total_tests'],1)*100:.1f}%")

# Write results to JSON
with open("/tmp/audit_results.json", "w") as f:
    json.dump(RESULTS, f, indent=2, default=str)
print("\n  Results written to /tmp/audit_results.json")
