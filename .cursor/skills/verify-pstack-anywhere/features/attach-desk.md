# Attach a desk

Attach copies vendor skills onto a throwaway folder, writes a host card and AGENTS.md stub there, and can remove only those paths later.

## Sub-features

- `attach-prepare` copies skills onto `--desk` and leaves the clone clean.
- `attach-observe` reports a receipt and an existing card.
- `attach-clean` removes attached paths and keeps evidence.

## How to get to it (user POV)

- Run `./bin/pstack-anywhere prepare --host codex --desk <dir>`.
- Run `./bin/pstack-anywhere observe --host codex --desk <dir>`.
- Run `./bin/pstack-anywhere clean --host codex --desk <dir>`.

## Driving it with verify-pstack-anywhere

Preconditions:

- `scripts/doctor.sh` has not yet been required for this feature, but `./bin/pstack-anywhere check` is `upstream lock ok`.
- `/tmp/pstack-verify/desks/inbox` does not exist, or the last run already cleaned it.

- **Prepare.** Run `.cursor/skills/verify-pstack-anywhere/scripts/drive-attach.sh`. Exit 0. `prepare.json` has `"kind": "installed"`. The desk contains `.agents/skills/poteto-mode/SKILL.md` and `.codex/pstack-host.md`. The clone still has no `.agents/` at repo root.
- **Observe.** The same script writes `observe.json` with `"kind": "observed"` and `"cardExists": true`. `AGENTS.md` on the desk contains `read .codex/pstack-host.md`.
- **Proof.** Copy `prepare.json`, `observe.json`, and a `find` listing into the evidence dir. Confirm `skills/poteto-mode/SKILL.md` in the clone is untouched.

## Gotchas

- `prepare` defaults `--home` to `<desk>/.shelf-home`. Do not export `PSTACK_HOME` to John's real home.
- `clean` removes attached skills. Drive Codex before clean.
- Cleanup of the desk is a later step. Do not delete evidence.
