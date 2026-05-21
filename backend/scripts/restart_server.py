#!/usr/bin/env python3
"""Check what's running on port 8007 and restart server if needed"""
import subprocess, os, signal, time

# Find PID on port 8007
try:
    result = subprocess.run(["lsof", "-ti", ":8007"], capture_output=True, text=True, timeout=5)
    pids = result.stdout.strip().split()
    if pids:
        print(f"Found PIDs on port 8007: {pids}")
        for pid in pids:
            os.kill(int(pid), signal.SIGTERM)
            print(f"Killed PID {pid}")
        time.sleep(2)
    else:
        print("No PIDs found on port 8007")
except Exception as e:
    print(f"Error: {e}")

# Wait a moment
time.sleep(1)

# Start server in background
print("Starting server...")
os.chdir("/Users/suren/socialpulses/backend")
proc = subprocess.Popen(
    ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007"],
    stdout=open("/Users/suren/socialpulses/logs/stdout.log", "a"),
    stderr=open("/Users/suren/socialpulses/logs/stderr.log", "a"),
    env={**os.environ, "PYTHONUNBUFFERED": "1"}
)
print(f"Server started with PID {proc.pid}")
