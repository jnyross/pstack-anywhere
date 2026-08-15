# Gold compare

After attach, Codex completes the greet task. Grok, Pi, and Oh My Pi then complete the same task on their own desks. Pass is behavioral. Source does not need to match Codex bytes.

## Sub-features

- `gold-codex` writes `src/greet.ts` and a bun test that `greet("Ada")` satisfies.
- `gold-grok` matches that behavior on a Grok desk.
- `gold-pi` matches that behavior on a Pi desk.
- `gold-omp` matches that behavior on an Oh My Pi desk.

## How to get to it (user POV)

- Attach with `prepare --host <id> --desk <dir>`.
- From that folder, run the host on an ordinary coding prompt.

## Driving it with verify-pstack-anywhere

Preconditions:

- `scripts/doctor.sh` exits 0.
- `HOST` is `codex`, `grok`, `pi`, or `omp`.

- **Drive all four.** Run `.cursor/skills/verify-pstack-anywhere/scripts/run-gold.sh`. Codex runs first. A Codex fail stops the loop.
- **Prompt.** The helper sends this prompt unchanged:

  `Add a greet(name) export in src/greet.ts that returns Hello, <name>. Add a one-line bun:test. Keep the change tiny.`

- **Grade.** `grade-gold.ts` writes `grade.json`. `"kind"` is `passed_gold_task` only when `src/greet.ts` exists, `greet("Ada")` is `Hello, Ada` or `Hello, Ada.`, and `bun test` exits 0.
- **Compare.** `compare-gold.ts` reads each host's `grade.json`. Exit 0 only when every gold host passed.
- **Proof.** Keep `host.log`, `grade.json`, `desk-tree.txt`, `src/greet.ts`, and `compare.json`. Then run `scripts/cleanup.sh`. Confirm the evidence directory still exists.

## Gotchas

- Codex `--full-auto` is deprecated. Use `--sandbox workspace-write`.
- A Codex run that loads `~/.codex/config.toml` will drown project skills. Isolated `CODEX_HOME` is required.
- A Grok run that loads `~/.grok/config.toml` can pin `grok-4.5`. Isolated `GROK_HOME` pins `grok-4.6`.
- Pi project skills need `--approve`. `-p` does not prompt.
- Oh My Pi needs `--approval-mode=yolo` in print mode.
- Do not name the desk `eval`, `test`, `judge`, or `candidate`.
- Droid is not in this loop.
