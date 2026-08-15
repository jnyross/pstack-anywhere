#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

ROOT="$(repo_root)"
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
unset HOST
"$SCRIPTS/doctor.sh"

RID="$(run_id)"
COMPARE_ROOT="$(evidence_root)"
mkdir -p "$COMPARE_ROOT"

for host in $(gold_hosts); do
  export HOST="$host"
  printf 'gold-host\t%s\n' "$HOST"
  "$SCRIPTS/drive-attach.sh"
  "$SCRIPTS/drive-host.sh"
  set +e
  bun "$SCRIPTS/grade-gold.ts" "$(evidence_dir)" "$(desk_dir)" "$HOST"
  GRADE=$?
  set -e
  if [[ "$HOST" == "codex" && "$GRADE" -ne 0 ]]; then
    printf 'gold-compare: Codex gold failed\n' >&2
    bun "$SCRIPTS/compare-gold.ts" "$COMPARE_ROOT" || true
    exit 1
  fi
done

bun "$SCRIPTS/compare-gold.ts" "$COMPARE_ROOT"
