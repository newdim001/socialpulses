
import http.server
import urllib.request
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5182
DIST = "/Users/suren/socialpulses-react/dist"
API_TARGET = "https://app.socialpulses.io"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Always serve from DIST directory
        return os.path.join(DIST, path.lstrip("/"))
    
    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy_api("GET")
        
        filepath = os.path.join(DIST, self.path.lstrip("/"))
        if self.path == "/" or not os.path.isfile(filepath):
            # SPA fallback - serve index.html
            self.path = "/index.html"
        
        return super().do_GET()
    
    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy_api("POST")
        self.send_error(404)
    
    def _proxy_api(self, method):
        url = API_TARGET + self.path
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len) if content_len else b""
        
        headers = {
            "Content-Type": self.headers.get("Content-Type", "application/json"),
        }
        auth = self.headers.get("Authorization", "")
        if auth:
            headers["Authorization"] = auth
        
        try:
            req = urllib.request.Request(url, data=body or None, method=method, headers=headers)
            resp = urllib.request.urlopen(req, timeout=30)
            self.send_response(resp.status)
            for k, v in resp.headers.items():
                if k.lower() not in ("transfer-encoding", "content-encoding", "content-length", "connection"):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() not in ("transfer-encoding", "content-encoding", "content-length", "connection"):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(str(e).encode())

os.chdir(DIST)
server = http.server.HTTPServer(("0.0.0.0", PORT), SPAHandler)
print(f"Serving SocialPulses on http://100.82.154.76:{PORT}")
server.serve_forever()
