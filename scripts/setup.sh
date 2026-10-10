#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export UV_CACHE_DIR="$repo_root/.local/uv-cache"
export UV_TOOL_DIR="$repo_root/.local/uv-tools"
export UV_TOOL_BIN_DIR="$repo_root/.local/bin"
mkdir -p "$UV_TOOL_BIN_DIR"
uv tool install mcp-grafana==2.0.2
"$UV_TOOL_BIN_DIR/mcp-grafana" --version
