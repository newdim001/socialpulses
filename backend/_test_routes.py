
import sys
sys.path.insert(0, "/Users/suren/socialpulses/backend")
from main import app
import json

# Check routes
routes = [(r.path, list(r.methods) if hasattr(r, "methods") else []) for r in app.routes if hasattr(r, "path")]
api = [r for r in routes if "/api/" in r[0]]
print("Routes:", len(api))
for p, m in api:
    if "analytic" in p or "bulk" in p or "ai/" in p:
        print(f"  {p} {m}")
