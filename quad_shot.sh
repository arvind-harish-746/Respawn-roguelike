#!/usr/bin/env bash
# Quad Shot — Linux Native Application Launcher
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$DIR/bin/quad_shot-linux"

if [ -f "$BIN" ]; then
    chmod +x "$BIN"
    exec "$BIN" "$@"
fi

# Self-healing fallback if binary is absent
echo "[Self-Heal] Starting Quad Shot embedded runtime..."
if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server 8080 -d "$DIR" &
    SERVER_PID=$!
    trap "kill $SERVER_PID 2>/dev/null || true" EXIT
    sleep 1
    
    # Try dedicated app window
    for BROWSER in google-chrome chromium chromium-browser brave-browser microsoft-edge; do
        if command -v "$BROWSER" >/dev/null 2>&1; then
            exec "$BROWSER" --app="http://127.0.0.1:8080/quad_shot/index.html" --window-size=1280,820
        fi
    done
    xdg-open "http://127.0.0.1:8080/quad_shot/index.html"
    wait $SERVER_PID
fi
