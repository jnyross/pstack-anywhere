#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

require_host
ROOT="$(repo_root)"
DESK="$(desk_dir)"
EVIDENCE="$(evidence_dir)"
RUNTIME="$(runtime_dir)/$HOST"
PROMPT='Add a greet(name) export in src/greet.ts that returns Hello, <name>. Add a one-line bun:test. Keep the change tiny.'

mkdir -p "$EVIDENCE" "$RUNTIME" "$DESK/src"

if [[ ! -f "$DESK/$(host_card)" ]]; then
  printf 'drive-host: attach the desk first\n' >&2
  exit 1
fi

if [[ ! -d "$DESK/.git" ]]; then
  git -C "$DESK" init -q
  git -C "$DESK" add -A
  git -C "$DESK" -c user.email=verify@pstack.local -c user.name=verify commit -q -m "desk" || true
fi

cat >"$DESK/src/index.ts" <<'EOF'
export {};
EOF
cat >"$DESK/package.json" <<'EOF'
{
  "name": "pstack-desk",
  "private": true,
  "type": "module"
}
EOF

LOG="$EVIDENCE/host.log"
STATUS=0
set +e
case "$HOST" in
  codex)
    AUTH="${HOME}/.codex/auth.json"
    if [[ ! -f "$AUTH" ]]; then
      printf 'drive-host: missing %s\n' "$AUTH" >&2
      exit 1
    fi
    cp "$AUTH" "$RUNTIME/auth.json"
    chmod 600 "$RUNTIME/auth.json"
    cat >"$RUNTIME/config.toml" <<'EOF'
model = "gpt-5.6-luna"
suppress_unstable_features_warning = true
EOF
    export CODEX_HOME="$RUNTIME"
    codex exec \
      -m gpt-5.6-luna \
      -C "$DESK" \
      -s workspace-write \
      --skip-git-repo-check \
      -- "$PROMPT" >"$LOG" 2>&1
    STATUS=$?
    ;;
  grok)
    AUTH="${HOME}/.grok/auth.json"
    if [[ ! -f "$AUTH" ]]; then
      printf 'drive-host: missing %s\n' "$AUTH" >&2
      exit 1
    fi
    mkdir -p "$RUNTIME"
    cp "$AUTH" "$RUNTIME/auth.json"
    chmod 600 "$RUNTIME/auth.json"
    cat >"$RUNTIME/config.toml" <<'EOF'
[models]
default = "grok-4.6"

[ui]
permission_mode = "always-approve"
EOF
    export GROK_HOME="$RUNTIME"
    grok -p "$PROMPT" \
      --cwd "$DESK" \
      -m grok-4.6 \
      --always-approve \
      --permission-mode auto \
      --max-turns 30 \
      --output-format plain \
      >"$LOG" 2>&1
    STATUS=$?
    ;;
  pi)
    (
      cd "$DESK"
      pi -p --no-session --approve -- "$PROMPT"
    ) >"$LOG" 2>&1
    STATUS=$?
    ;;
  omp)
    omp --cwd "$DESK" \
      -p \
      --no-session \
      --approval-mode=yolo \
      --model gpt-5.6-luna \
      -- "$PROMPT" >"$LOG" 2>&1
    STATUS=$?
    ;;
  *)
    printf 'drive-host: unknown HOST %s\n' "$HOST" >&2
    exit 1
    ;;
esac
set -e

printf 'host_exit\t%s\n' "$STATUS" >"$EVIDENCE/host-exit.txt"
find "$DESK" -path "$DESK/.git" -prune -o -path "$DESK/.shelf-home" -prune -o -path "$DESK/.agents" -prune -o -path "$DESK/.grok" -prune -o -path "$DESK/.pi" -prune -o -path "$DESK/.omp" -prune -o -print | sort >"$EVIDENCE/desk-tree.txt"
rm -f "$EVIDENCE/greet.ts"
if [[ -f "$DESK/src/greet.ts" ]]; then
  cp "$DESK/src/greet.ts" "$EVIDENCE/greet.ts"
fi

exit 0
