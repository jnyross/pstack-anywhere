---
name: verify-pstack-anywhere
description: Drive pstack-anywhere on throwaway desks and prove Codex, Grok, Pi, and Oh My Pi complete the same greet coding task. Use when verifying probe, prepare, observe, clean, or Mini gold-compare.
disable-model-invocation: true
---

# Verify pstack-anywhere

The product is a CLI. There is no server. A user clones the repo, runs `./bin/pstack-anywhere`, and a Mini host opens a desk that is not this clone.

Vendor trees under `skills/` and `agents/` stay byte-identical to upstream. Do not edit them from this skill.

## Launch

From the pstack-anywhere repo root:

```bash
./bin/pstack-anywhere check
```

Ready when stdout is `upstream lock ok`. Teardown is process-less. Each drive starts a new CLI process.

Desks live under `/tmp/pstack-verify/desks/<host>/`. Evidence lives under `/tmp/pstack-verify/evidence/<run-id>/`. Isolated Codex and Grok homes live under `/tmp/pstack-verify/runtime/<run-id>/` and are not evidence.

## Doctor

```bash
.cursor/skills/verify-pstack-anywhere/scripts/doctor.sh
```

Require exit 0. The script checks Bun, `./bin/pstack-anywhere check`, and a `found` probe row for `codex`, `grok`, `pi`, and `omp`. Do not drive gold-compare when doctor fails.

## Drive

Harness is the committed scripts in `scripts/` plus this CLI. Commands are literal. Set `HOST` to `codex`, `grok`, `pi`, or `omp`.

1. Attach a desk. `HOST=<id> .cursor/skills/verify-pstack-anywhere/scripts/drive-attach.sh`
2. Run that host on the desk. `HOST=<id> .cursor/skills/verify-pstack-anywhere/scripts/drive-host.sh`
3. Grade the greet task. `bun .cursor/skills/verify-pstack-anywhere/scripts/grade-gold.ts <evidence-dir> <desk> <host>`

To run Codex first, then Grok, Pi, and Oh My Pi on the same prompt:

```bash
.cursor/skills/verify-pstack-anywhere/scripts/run-gold.sh
```

Read the feature file before the matching script. Mapped features are in [features/README.md](features/README.md).

Do not put `eval`, `test`, `judge`, `benchmark`, or `candidate` in desk paths or in the prompt. The prompt is an ordinary coding request. Do not add `/poteto-mode` to this prompt. The pass bar is the greet task, not a card-read.

Codex model is `gpt-5.6-luna`. Grok model is `grok-4.6`. Oh My Pi model is `gpt-5.6-luna`. Drive Codex with an isolated `CODEX_HOME` and Grok with an isolated `GROK_HOME`. Each copies `auth.json` from the user home. That keeps John's global skill budget from drowning the desk install.

## Evidence

Proof directory is `/tmp/pstack-verify/evidence/<run-id>/`. It must still exist after cleanup. Each host writes `<run-id>/<host>/`. Compare output is `<run-id>/compare.json`. A Mini receipt of a passing gold-compare is committed at [receipts/gold-20260815T150928Z/compare.json](receipts/gold-20260815T150928Z/compare.json).

Required artifacts:

- `doctor.txt` from doctor stdout
- `prepare.json` and `observe.json` from attach
- `host.log` from the host transcript
- `grade.json` from the gold grader
- `desk-tree.txt` listing the desk after the host exits
- `compare.json` after all four hosts

Proof standards:

- Exercise the real CLI and the real host binary. Do not stub host output.
- Capture the command and the resulting desk state, not only the last model sentence.
- `passed_gold_task` requires `src/greet.ts` to exist, `greet("Ada")` to return `Hello, Ada` or `Hello, Ada.`, and `bun test` to exit 0.
- Codex is the gold host. Compare hosts pass by matching that behavior, not by matching Codex source bytes.
- `failed_to_start` is a skip with evidence, not a pass.
- Do not copy `auth.json` into evidence.

## Cleanup

```bash
.cursor/skills/verify-pstack-anywhere/scripts/cleanup.sh
```

Removes desks and runtime auth copies this run created. Leaves `/tmp/pstack-verify/evidence/`. Kill only paths the scripts created. Do not `pkill` by process name.

## Helpers

All helpers are executable. Run them from the pstack-anywhere repo root.

- `scripts/doctor.sh` read-only health
- `scripts/drive-attach.sh` prepare plus observe for `$HOST`
- `scripts/drive-host.sh` isolated host exec for `$HOST`
- `scripts/drive-codex.sh` wrapper that sets `HOST=codex`
- `scripts/grade-gold.ts` greet-task grade
- `scripts/compare-gold.ts` Codex-vs-fleet summary
- `scripts/run-gold.sh` doctor, four hosts, compare
- `scripts/cleanup.sh` desk and runtime teardown

## Maintain the map

When probe, prepare, or host flags change, run `/maintain-verification-skill` and update the matching feature file. Do not leave a helper that the map no longer describes.
