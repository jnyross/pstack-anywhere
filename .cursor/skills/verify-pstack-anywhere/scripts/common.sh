#!/usr/bin/env bash
set -euo pipefail

_VERIFY_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

repo_root() {
  local d
  d="$(cd "$_VERIFY_SCRIPTS_DIR/../../../.." && pwd)"
  if [[ ! -x "$d/bin/pstack-anywhere" ]]; then
    printf 'pstack-anywhere repo root not found from %s\n' "$_VERIFY_SCRIPTS_DIR" >&2
    exit 1
  fi
  printf '%s\n' "$d"
}

verify_root() {
  printf '%s/.cursor/skills/verify-pstack-anywhere\n' "$(repo_root)"
}

run_id() {
  if [[ -n "${RUN_ID:-}" ]]; then
    printf '%s\n' "$RUN_ID"
    return
  fi
  mkdir -p "$(base_dir)"
  local stamp
  stamp="$(base_dir)/current-run"
  if [[ -f "$stamp" ]]; then
    cat "$stamp"
    return
  fi
  RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
  printf '%s\n' "$RUN_ID" >"$stamp"
  printf '%s\n' "$RUN_ID"
}

base_dir() {
  printf '%s\n' "${PSTACK_VERIFY_ROOT:-/tmp/pstack-verify}"
}

desk_dir() {
  printf '%s/desks/inbox\n' "$(base_dir)"
}

evidence_dir() {
  printf '%s/evidence/%s\n' "$(base_dir)" "$(run_id)"
}

runtime_dir() {
  printf '%s/runtime/%s\n' "$(base_dir)" "$(run_id)"
}
