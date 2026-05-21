#!/usr/bin/env python3
"""Standalone publisher runner — runs as a separate systemd service."""
import sys
import os
import logging
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Must load .env before any imports that read env vars
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(dotenv_path):
    with open(dotenv_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from publisher import Publisher

logger = logging.getLogger("publisher-runner")

def main():
    logger.info("Publisher runner starting...")
    pub = Publisher(interval_seconds=60)
    pub.start()
    logger.info("Publisher running (checking every 60s)")
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        logger.info("Shutting down publisher...")
        pub.stop()
        logger.info("Publisher stopped")

if __name__ == "__main__":
    main()
