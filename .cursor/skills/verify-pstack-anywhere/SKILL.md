---
name: verify-pstack-anywhere
description: Drive pstack-anywhere on a throwaway desk and prove a Mini host used the installed card or poteto-mode skill. Use when verifying probe, prepare, observe, clean, or a real Codex attach.
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

Desks live under `/tmp/pstack-verify/desks/`. Evidence lives under `/tmp/pstack-verify/evidence/<run-id>/`. Isolated Codex auth copies live under `/tmp/pstack-verify/runtime/<run-id>/` and are not evidence.

## Doctor

```bash
.cursor/skills/verify-pstack-anywhere/scripts/doctor.sh
```

Require exit 0. The script checks Bun, `./bin/pstack-anywhere check`, a `found` Codex row from `probe`, and `codex` on `PATH`. Do not drive Codex when doctor fails.

## Drive

Harness is the committed scripts in `scripts/` plus this CLI. Commands are literal.

1. Attach a desk. `.cursor/skills/verify-pstack-anywhere/scripts/drive-attach.sh`
2. Run real Codex on that desk. `.cursor/skills/verify-pstack-anywhere/scripts/drive-codex.sh`
3. Grade the Codex transcript. `bun .cursor/skills/verify-pstack-anywhere/scripts/grade-codex.ts <evidence-dir> <desk>`

Read the feature file before the matching script. Mapped features are in [features/README.md](features/README.md).

Do not put `eval`, `test`, `judge`, `benchmark`, or `candidate` in desk paths or in the Codex prompt. The prompt is an ordinary coding request.

Codex model is `gpt-5.6-luna`. Do not use Sol. Drive with an isolated `CODEX_HOME` that contains only `auth.json` copied from the user home. That keeps John's global skill budget from drowning the desk install.

## Evidence

Proof directory is `/tmp/pstack-verify/evidence/<run-id>/`. It must still exist after cleanup.

Required artifacts:

- `doctor.txt` from doctor stdout
- `prepare.json` and `observe.json` from attach
- `codex.log` from the Codex exec transcript
- `grade.json` from the grader
- `desk-tree.txt` listing the desk after Codex exits

Proof standards:

- Exercise the real CLI and the real `codex exec`. Do not stub host output.
- Capture the command and the resulting desk state, not only the last Codex sentence.
- `used_installed_instructions` requires the transcript to show a read of `.codex/pstack-host.md` or `poteto-mode`. A greet file without that read is `did_task_only`, which is not a pass.
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
- `scripts/drive-attach.sh` prepare plus observe
- `scripts/drive-codex.sh` isolated Codex exec
- `scripts/grade-codex.ts` transcript grade
- `scripts/cleanup.sh` desk and runtime teardown
