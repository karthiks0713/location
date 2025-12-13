#!/bin/bash
set -e

echo "Starting Xvfb..."
# Start X Virtual Framebuffer in background
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Wait for X server to be ready
echo "Waiting for X server to be ready..."
sleep 3

# Verify X server is running
if ! kill -0 $XVFB_PID 2>/dev/null; then
  echo "ERROR: Xvfb failed to start"
  exit 1
fi

echo "Xvfb started with PID: $XVFB_PID"
echo "DISPLAY is set to: $DISPLAY"

# Start the API server in foreground
echo "Starting API server..."
exec node scraper-api-server.js

