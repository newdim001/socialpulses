#!/usr/bin/env python3
"""Simple SPA server with API proxy for SocialPulses"""
import http.server
import urllib.request
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5176
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
API_TARGET = "https://app.socialpulses.io"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            url = API_TARGET + self.path
            headers = {k: v for k, v in self.headers.items()
                      if k.lower() in ("authorization", "content-type", "cookie", "accept")}
            try:
                req = urllib.request.Request(url, headers=headers)
                resp = urllib.request.urlopen(req)
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                for k, v in e.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(502)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(str(e).encode())
            return
        filepath = os.path.join(DIST, self.path.lstrip("/"))
        if self.path == "/" or not os.path.isfile(filepath):
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len) if content_len else b""
            url = API_TARGET + self.path
            headers = {k: v for k, v in self.headers.items()
                      if k.lower() in ("authorization", "content-type", "cookie")}
            try:
                req = urllib.request.Request(url, data=body, method="POST", headers=headers)
                resp = urllib.request.urlopen(req)
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                for k, v in e.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(e.read())
            return
        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    os.chdir(DIST)
    server = http.server.HTTPServer(("0.0.0.0", PORT), SPAHandler)
    print(f"Serving SocialPulses on http://100.82.154.76:{PORT}")
    print(f"API proxy -> {API_TARGET}")
    server.serve_forever()
