#!/bin/bash
# Don't use set -e - we want to see errors, not exit silently

# Set PORT from Railway (required)
export PORT=${PORT:-3001}
echo "=========================================="
echo "Starting Scraper API Server"
echo "PORT: $PORT"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "=========================================="

# Start Xvfb in background (non-blocking - don't wait)
echo "Starting Xvfb in background..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset > /dev/null 2>&1 &
export DISPLAY=${DISPLAY:-:99}
echo "DISPLAY set to: $DISPLAY"

# Start Node.js server IMMEDIATELY (don't wait for Xvfb)
echo "Starting Node.js server on 0.0.0.0:$PORT..."
echo "Server starting now - Xvfb running in background"
echo "=========================================="

# Use exec to replace shell with node process
# This ensures Railway sees the process correctly
exec node scraper-api-server.js
