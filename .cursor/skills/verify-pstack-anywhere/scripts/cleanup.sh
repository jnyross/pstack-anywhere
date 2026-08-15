#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

BASE="$(base_dir)"
RID="$(run_id)"
rm -rf "$BASE/desks" "$BASE/runtime"
rm -f "$BASE/current-run"
printf 'removed desks and runtime for %s\n' "$RID"
printf 'evidence kept at %s/evidence/%s\n' "$BASE" "$RID"
test -d "$BASE/evidence/$RID"
