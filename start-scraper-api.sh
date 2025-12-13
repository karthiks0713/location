#!/bin/bash
set -e

# Set PORT from Railway (required)
export PORT=${PORT:-3001}
echo "=========================================="
echo "Starting Scraper API Server"
echo "PORT: $PORT"
echo "=========================================="

# Start Xvfb in background (non-blocking - don't wait)
echo "Starting Xvfb in background..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset > /dev/null 2>&1 &
export DISPLAY=${DISPLAY:-:99}

# Start Node.js server IMMEDIATELY (don't wait for Xvfb)
echo "Starting Node.js server on 0.0.0.0:$PORT..."
echo "Server starting now - Xvfb running in background"
exec node scraper-api-server.js
