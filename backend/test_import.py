import sys
sys.path.insert(0, "/Users/suren/socialpulses/backend")
try:
    import main
    print("main imported OK")
    routes = [r.path for r in main.app.routes if hasattr(r, "path") and r.path.startswith("/api/")]
    print(f"API Routes ({len(routes)}):")
    for r in sorted(set(routes)):
        print(f"  {r}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
