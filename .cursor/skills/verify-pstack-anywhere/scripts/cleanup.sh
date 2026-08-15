#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

BASE="$(base_dir)"
RID="$(run_id)"
rm -rf "$(desk_dir)" "$(runtime_dir)"
rm -f "$BASE/current-run"
printf 'removed desks and runtime for %s\n' "$RID"
printf 'evidence kept at %s/evidence/%s\n' "$BASE" "$RID"
test -d "$BASE/evidence/$RID"
# Keep other run evidence. Only drop empty parents we own if present.
if [[ -d "$BASE/desks" ]] && [[ -z "$(ls -A "$BASE/desks" 2>/dev/null || true)" ]]; then
  rmdir "$BASE/desks" || true
fi
