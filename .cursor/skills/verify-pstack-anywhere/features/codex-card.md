# Codex uses the installed card

After attach, a real Codex CLI run on the desk follows the AGENTS.md stub into `.codex/pstack-host.md` or opens `poteto-mode`, then makes the tiny library change.

## Sub-features

- `codex-start` starts `codex exec` on the desk with isolated `CODEX_HOME`.
- `codex-edit` adds `src/greet.ts`.
- `codex-card` reads `.codex/pstack-host.md` or `poteto-mode` in the transcript.

## How to get to it (user POV)

- Attach with `prepare --host codex --desk <dir>`.
- From that folder, run Codex on an ordinary coding prompt.

## Driving it with verify-pstack-anywhere

Preconditions:

- `scripts/doctor.sh` exits 0.
- Attach has already produced a desk with `.codex/pstack-host.md` and `.agents/skills/poteto-mode/SKILL.md`.
- John's `~/.codex/auth.json` exists. Do not print it.

- **Drive.** Run `.cursor/skills/verify-pstack-anywhere/scripts/drive-codex.sh`. The helper copies auth into `/tmp/pstack-verify/runtime/<run-id>/`, exports that as `CODEX_HOME`, seeds `src/index.ts`, and runs `codex exec -m gpt-5.6-luna`.
- **Prompt.** The helper sends this prompt unchanged:

  `Add a greet(name) export in src/greet.ts that returns Hello, <name>. Add a one-line bun:test. Work in /poteto-mode. Keep the change tiny.`

- **Grade.** Run `bun .cursor/skills/verify-pstack-anywhere/scripts/grade-codex.ts <evidence-dir> <desk>`. `grade.json` `"kind"` is `used_installed_instructions` only when `codex.log` shows a read of `pstack-host.md` or `poteto-mode` and `src/greet.ts` exists.
- **Proof.** Keep `codex.log`, `grade.json`, `desk-tree.txt`, and `src/greet.ts` copied into evidence. Then run `scripts/cleanup.sh`. Confirm the evidence directory still exists.

## Gotchas

- `--full-auto` is deprecated. Use `--sandbox workspace-write`.
- A run that loads `~/.codex/config.toml` will drown project skills. Isolated `CODEX_HOME` is required.
- `did_task_only` means greet landed and the card was ignored. That is not a pass. Iterate the helper, not the predicate.
- Do not name the desk `eval`, `test`, `judge`, or `candidate`.
