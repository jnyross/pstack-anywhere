#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

ROOT="$(repo_root)"
DESK="$(desk_dir)"
EVIDENCE="$(evidence_dir)"
RUNTIME="$(runtime_dir)"
AUTH="${HOME}/.codex/auth.json"

mkdir -p "$EVIDENCE" "$RUNTIME" "$DESK/src"

if [[ ! -f "$DESK/.codex/pstack-host.md" ]]; then
  printf 'drive-codex: attach the desk first\n' >&2
  exit 1
fi
if [[ ! -f "$AUTH" ]]; then
  printf 'drive-codex: missing %s\n' "$AUTH" >&2
  exit 1
fi

cp "$AUTH" "$RUNTIME/auth.json"
chmod 600 "$RUNTIME/auth.json"
cat >"$RUNTIME/config.toml" <<'EOF'
model = "gpt-5.6-luna"
suppress_unstable_features_warning = true
EOF

if [[ ! -d "$DESK/.git" ]]; then
  git -C "$DESK" init -q
  git -C "$DESK" add -A
  git -C "$DESK" -c user.email=verify@pstack.local -c user.name=verify commit -q -m "desk" || true
fi

cat >"$DESK/src/index.ts" <<'EOF'
export {};
EOF

export CODEX_HOME="$RUNTIME"
PROMPT='Add a greet(name) export in src/greet.ts that returns Hello, <name>. Add a one-line bun:test. Work in /poteto-mode. Keep the change tiny.'

set +e
codex exec \
  -m gpt-5.6-luna \
  -C "$DESK" \
  -s workspace-write \
  --skip-git-repo-check \
  -- "$PROMPT" >"$EVIDENCE/codex.log" 2>&1
STATUS=$?
set -e
printf 'codex_exit\t%s\n' "$STATUS" >"$EVIDENCE/codex-exit.txt"

find "$DESK" -path "$DESK/.git" -prune -o -path "$DESK/.shelf-home" -prune -o -path "$DESK/.agents" -prune -o -print | sort >"$EVIDENCE/desk-tree.txt"
rm -f "$EVIDENCE/greet.ts"
if [[ -f "$DESK/src/greet.ts" ]]; then
  cp "$DESK/src/greet.ts" "$EVIDENCE/greet.ts"
fi

exit 0
