#!/bin/bash
set -e

# Set PORT from Railway or use default
export PORT=${PORT:-3001}
echo "PORT: $PORT"

# Start Xvfb in background (non-blocking, don't wait for it)
echo "Starting Xvfb in background..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset > /dev/null 2>&1 &
XVFB_PID=$!

# Don't wait - start server immediately
echo "DISPLAY: ${DISPLAY:-:99}"
export DISPLAY=${DISPLAY:-:99}

# Start the API server immediately (don't wait for Xvfb)
echo "Starting Node.js API server on 0.0.0.0:$PORT..."
echo "Server will start immediately - Xvfb is starting in background"
exec node scraper-api-server.js
