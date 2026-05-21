import os
import sys

# Python 3.9 compatibility: add site-packages to path
for p in [
    os.path.expanduser("~/Library/Python/3.9/lib/python/site-packages"),
    "/opt/homebrew/lib/python3.9/site-packages",
]:
    if os.path.isdir(p) and p not in sys.path:
        sys.path.insert(0, p)
