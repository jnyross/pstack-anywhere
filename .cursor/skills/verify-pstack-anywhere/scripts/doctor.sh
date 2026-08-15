#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

ROOT="$(repo_root)"
EVIDENCE_ROOT="$(evidence_root)"
mkdir -p "$EVIDENCE_ROOT"
OUT="$EVIDENCE_ROOT/doctor.txt"
: >"$OUT"

{
  printf 'repo\t%s\n' "$ROOT"
  command -v bun
  bun --version
  command -v codex
  codex --version
  command -v grok
  grok --version
  command -v pi
  pi --version
  command -v omp
  omp --version
} | tee -a "$OUT"

cd "$ROOT"
CHECK="$("$ROOT/bin/pstack-anywhere" check)"
printf 'check\t%s\n' "$CHECK" | tee -a "$OUT"
if [[ "$CHECK" != "upstream lock ok" ]]; then
  exit 1
fi

PROBE="$("$ROOT/bin/pstack-anywhere" probe)"
printf '%s\n' "$PROBE" | tee -a "$OUT"
for name in $(gold_hosts); do
  if ! printf '%s\n' "$PROBE" | grep -q $'^found\t'"$name"$'\t'; then
    printf 'doctor: %s is not found\n' "$name" | tee -a "$OUT"
    exit 1
  fi
done
