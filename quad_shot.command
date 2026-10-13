#!/usr/bin/env bash
# Quad Shot — macOS Native Application Launcher
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
ARCH=$(uname -m)

if [ "$ARCH" = "arm64" ] && [ -f "$DIR/bin/quad_shot-macos-arm64" ]; then
    chmod +x "$DIR/bin/quad_shot-macos-arm64"
    exec "$DIR/bin/quad_shot-macos-arm64" "$@"
elif [ -f "$DIR/bin/quad_shot-macos" ]; then
    chmod +x "$DIR/bin/quad_shot-macos"
    exec "$DIR/bin/quad_shot-macos" "$@"
fi

# Fallback
open "$DIR/quad_shot/index.html"
