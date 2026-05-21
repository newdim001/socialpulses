#!/usr/bin/env python3
import urllib.request, json, sys
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8011"
U = sys.argv[2] if len(sys.argv) > 2 else "admin"
P = sys.argv[3] if len(sys.argv) > 3 else "admin123"
TOKEN = None
OK = 0; FAIL = 0

def api(m, p, d=None):
    global TOKEN
    h = {"Content-Type": "application/json"}
    if TOKEN and "/login" not in p:
        h["Authorization"] = "Bearer " + TOKEN
    b = json.dumps(d).encode() if d else None
    try:
        r = urllib.request.urlopen(urllib.request.Request(BASE + p, data=b, headers=h, method=m), timeout=10)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {"detail": str(e.reason)}
    except Exception as e: return None, str(e)

def t(n, m, p, d=None, ck=None, mi=None):
    global OK, FAIL
    s, r = api(m, p, d)
    ok = True
    if s is None: ok = False; why = "conn"
    elif s >= 300: ok = False; why = "HTTP " + str(s)
    elif ck and isinstance(r,dict) and ck not in r: ok = False; why = "no " + ck
    elif mi and isinstance(r,list) and len(r) < mi: ok = False; why = str(len(r)) + "<" + str(mi)
    if ok:
        OK += 1
        x = ""
        if isinstance(r,dict): x = " " + str(list(r.keys())[:3])
        elif isinstance(r,list): x = " n=" + str(len(r))
        print("  OK [" + str(s) + "] " + n + x)
    else:
        FAIL += 1
        d = str(r.get("detail",r))[:80] if isinstance(r,dict) else str(r)[:80]
        print("  FAIL [" + str(s) + "] " + n + ": " + why + " - " + d)

s, r = api("POST", "/api/auth/login", {"username": U, "password": P})
TOKEN = r.get("token", "")
print("=== 1. AUTH ===")
print("  " + ("OK" if TOKEN else "FAIL") + " Login")
t("Auth check", "GET", "/api/auth/check", ck="username")
print("\n=== 2. DASHBOARD ===")
t("Dashboard", "GET", "/api/dashboard", ck="total_scheduled")
print("\n=== 3. POSTS ===")
t("All posts", "GET", "/api/posts", mi=1)
t("Filter 2026", "GET", "/api/posts?year=2026", mi=1)
s2, pd = api("POST", "/api/posts", {"content": "E2E test", "type": "draft"})
if s2 == 200 and pd.get("id"):
    pid = pd["id"]; OK += 1
    print("  OK Created post " + str(pid))
    t("Update", "PUT", "/api/posts/" + str(pid), {"content": "Updated"})
    t("Get", "GET", "/api/posts/" + str(pid), ck="id")
    t("Duplicate", "POST", "/api/posts/" + str(pid) + "/duplicate", ck="id")
    t("Publish", "POST", "/api/posts/" + str(pid) + "/publish-now")
    t("Delete", "DELETE", "/api/posts/" + str(pid))
else:
    FAIL += 1; print("  FAIL Create post: " + str(s2))
print("\n=== 4. CALENDAR ===")
t("Calendar", "GET", "/api/calendar?year=2026&month=5")
print("\n=== 5. PLATFORMS / ACCOUNTS ===")
t("Platforms", "GET", "/api/platforms", mi=12)
t("Accounts", "GET", "/api/accounts")
print("\n=== 6. MEDIA ===")
t("Media", "GET", "/api/media")
t("Folders", "GET", "/api/media/folders")
print("\n=== 7. AI ===")
t("AI gen", "POST", "/api/ai/generate", {"topic":"Test","tone":"Professional","length":"Short","platform":"twitter"})
print("\n=== 8. ANALYTICS ===")
t("Summary", "GET", "/api/analytics/summary?start=2026-01-01&end=2026-12-31", ck="total_posts")
t("Heatmap", "GET", "/api/analytics/calendar-heatmap?year=2026")
t("Best time", "GET", "/api/analytics/best-time")
t("Sentiment", "GET", "/api/analytics/sentiment")
print("\n=== 9. CONTENT TOOLS ===")
for ep in ["/api/saved-replies","/api/hashtag-groups","/api/link-bio","/api/utm-templates","/api/spike-alerts","/api/spike-alerts/events"]:
    t(ep, "GET", ep)
print("\n=== 10. ENTERPRISE ===")
for ep in ["/api/campaigns","/api/listening/topics","/api/listening/dashboard","/api/influencers","/api/influencer-campaigns","/api/bot-rules","/api/reports/premium","/api/tags","/api/report-templates","/api/reports/summary"]:
    t(ep, "GET", ep)
print("\n=== 11. CORE SOCIAL ===")
t("Inbox", "GET", "/api/inbox/conversations")
t("Kanban cols", "GET", "/api/kanban/columns")
t("Kanban card", "POST", "/api/kanban/cards", {"title":"E2E card","content":"Test"})
t("Approvals", "GET", "/api/posts/pending-approval")
t("Notifs", "GET", "/api/notifications")
print("\n=== 12. INFRASTRUCTURE ===")
t("Health", "GET", "/api/health", ck="status")
t("Settings", "GET", "/api/settings")
t("Publisher", "GET", "/api/publisher/status")
t("Clients", "GET", "/api/clients", mi=1)
t("Orgs", "GET", "/api/orgs")
t("Recurring", "GET", "/api/recurring/slots")
t("Change pw", "POST", "/api/auth/change-password", {"current_password":P,"new_password":P})
print("\n=== 13. CRUD ===")
s3, cp = api("POST", "/api/campaigns", {"name":"E2E Campaign","start_date":"2026-06-01","end_date":"2026-07-01","description":"Test"})
if s3 == 200 and cp.get("id"):
    cid = cp["id"]; OK += 1
    print("  OK Campaign " + str(cid))
    api("DELETE", "/api/campaigns/" + str(cid))
else:
    FAIL += 1; print("  FAIL Campaign: " + str(s3) + " " + str(cp)[:60])
s4, ida = api("POST", "/api/inbox/conversations", {"contact_name":"E2E Test","platform":"twitter","first_message":"Audit test"})
if s4 == 200 and ida.get("id"):
    ci = ida["id"]; OK += 1
    print("  OK Inbox " + str(ci))
    api("DELETE", "/api/inbox/conversations/" + str(ci))
else:
    print("  Inbox create: " + str(s4))
total = OK + FAIL
print("\n" + "=" * 50)
print("RESULTS: " + str(OK) + " pass | " + str(FAIL) + " fail | " + str(int(OK/total*100)) + "% (" + str(total) + " tests)")
print("=" * 50)
sys.exit(0 if FAIL == 0 else 1)
