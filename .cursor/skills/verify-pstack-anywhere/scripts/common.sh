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

gold_hosts() {
  printf 'codex grok pi omp\n'
}

require_host() {
  if [[ -z "${HOST:-}" ]]; then
    printf 'HOST is required (codex|grok|pi|omp)\n' >&2
    exit 1
  fi
}

host_card() {
  case "${HOST}" in
    codex) printf '.codex/pstack-host.md' ;;
    grok) printf '.grok/pstack-host.md' ;;
    pi) printf '.pi/pstack-host.md' ;;
    omp) printf '.omp/pstack-host.md' ;;
    *) printf 'unknown HOST %s\n' "${HOST}" >&2; exit 1 ;;
  esac
}

host_skill() {
  case "${HOST}" in
    codex) printf '.agents/skills/poteto-mode/SKILL.md' ;;
    grok) printf '.grok/skills/poteto-mode/SKILL.md' ;;
    pi) printf '.pi/skills/poteto-mode/SKILL.md' ;;
    omp) printf '.omp/skills/poteto-mode/SKILL.md' ;;
    *) printf 'unknown HOST %s\n' "${HOST}" >&2; exit 1 ;;
  esac
}

host_stub_needle() {
  case "${HOST}" in
    codex) printf 'read .codex/pstack-host.md' ;;
    grok) printf 'read .grok/pstack-host.md' ;;
    pi) printf 'read .pi/pstack-host.md' ;;
    omp) printf 'read .omp/pstack-host.md' ;;
    *) printf 'unknown HOST %s\n' "${HOST}" >&2; exit 1 ;;
  esac
}

desk_dir() {
  require_host
  printf '%s/desks/%s\n' "$(base_dir)" "$HOST"
}

evidence_dir() {
  require_host
  printf '%s/evidence/%s/%s\n' "$(base_dir)" "$(run_id)" "$HOST"
}

evidence_root() {
  printf '%s/evidence/%s\n' "$(base_dir)" "$(run_id)"
}

runtime_dir() {
  printf '%s/runtime/%s\n' "$(base_dir)" "$(run_id)"
}
