#!/usr/bin/env bash
set -euo pipefail
export HOST=codex
exec "$(cd "$(dirname "$0")" && pwd)/drive-host.sh"
