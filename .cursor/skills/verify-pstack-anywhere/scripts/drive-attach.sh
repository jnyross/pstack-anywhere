#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

ROOT="$(repo_root)"
DESK="$(desk_dir)"
EVIDENCE="$(evidence_dir)"
mkdir -p "$EVIDENCE" "$(dirname "$DESK")"

if [[ -e "$DESK" ]]; then
  rm -rf "$DESK"
fi

cd "$ROOT"
"$ROOT/bin/pstack-anywhere" prepare --host codex --desk "$DESK" | tee "$EVIDENCE/prepare.json"
"$ROOT/bin/pstack-anywhere" observe --host codex --desk "$DESK" | tee "$EVIDENCE/observe.json"

test -f "$DESK/.codex/pstack-host.md"
test -f "$DESK/.agents/skills/poteto-mode/SKILL.md"
grep -q 'read .codex/pstack-host.md' "$DESK/AGENTS.md"
test ! -e "$ROOT/.agents"

find "$DESK" -path "$DESK/.git" -prune -o -print | sort >"$EVIDENCE/desk-before.txt"
printf 'desk\t%s\n' "$DESK" >"$EVIDENCE/attach.txt"
