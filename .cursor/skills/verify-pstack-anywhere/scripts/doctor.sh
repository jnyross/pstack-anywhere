#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

ROOT="$(repo_root)"
EVIDENCE="$(evidence_dir)"
mkdir -p "$EVIDENCE"
OUT="$EVIDENCE/doctor.txt"
: >"$OUT"

{
  printf 'repo\t%s\n' "$ROOT"
  command -v bun
  bun --version
  command -v codex
  codex --version
} | tee -a "$OUT"

cd "$ROOT"
CHECK="$("$ROOT/bin/pstack-anywhere" check)"
printf 'check\t%s\n' "$CHECK" | tee -a "$OUT"
if [[ "$CHECK" != "upstream lock ok" ]]; then
  exit 1
fi

PROBE="$("$ROOT/bin/pstack-anywhere" probe)"
printf '%s\n' "$PROBE" | tee -a "$OUT"
if ! printf '%s\n' "$PROBE" | grep -q $'^found\tcodex\t'; then
  printf 'doctor: Codex is not found\n' | tee -a "$OUT"
  exit 1
fi
