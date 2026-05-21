#!/bin/bash
# =============================================================================
# Cron wrapper for SocialPulses RSS Auto-Posting Worker
#
# This script sources the DATABASE_URL from the .env file and runs the worker.
#
# Install in crontab (as root):
#   */30 * * * * /var/www/socialpulses/backend/cron_rss_worker.sh >> /var/log/socialpulses/rss_worker.log 2>&1
#
# Or as a systemd timer (see rss-worker.timer / rss-worker.service).
# =============================================================================

set -euo pipefail

APP_DIR="/var/www/socialpulses/backend"
LOG_DIR="/var/log/socialpulses"
SCRIPT="$APP_DIR/rss_worker.py"
ENV_FILE="$APP_DIR/.env"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Source environment variables (DATABASE_URL and others)
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Run the worker
cd "$APP_DIR"
exec python3 "$SCRIPT" --quiet
