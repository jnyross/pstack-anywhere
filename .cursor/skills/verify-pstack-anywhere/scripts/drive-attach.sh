#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

require_host
ROOT="$(repo_root)"
DESK="$(desk_dir)"
EVIDENCE="$(evidence_dir)"
mkdir -p "$EVIDENCE" "$(dirname "$DESK")"

if [[ -e "$DESK" ]]; then
  rm -rf "$DESK"
fi

cd "$ROOT"
"$ROOT/bin/pstack-anywhere" prepare --host "$HOST" --desk "$DESK" | tee "$EVIDENCE/prepare.json"
"$ROOT/bin/pstack-anywhere" observe --host "$HOST" --desk "$DESK" | tee "$EVIDENCE/observe.json"

test -f "$DESK/$(host_card)"
test -f "$DESK/$(host_skill)"
grep -q "$(host_stub_needle)" "$DESK/AGENTS.md"
test ! -e "$ROOT/.agents"
test ! -e "$ROOT/.grok/skills"
test ! -e "$ROOT/.pi/skills"
test ! -e "$ROOT/.omp/skills"

find "$DESK" -path "$DESK/.git" -prune -o -print | sort >"$EVIDENCE/desk-before.txt"
printf 'desk\t%s\n' "$DESK" >"$EVIDENCE/attach.txt"
