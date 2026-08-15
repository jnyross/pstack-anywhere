# Attach a desk

Attach copies vendor skills onto a throwaway folder, writes a host card and AGENTS.md stub there, and can remove only those paths later.

## Sub-features

- `attach-prepare` copies skills onto `--desk` and leaves the clone clean.
- `attach-observe` reports a receipt and an existing card.
- `attach-clean` removes attached paths and keeps evidence.

## How to get to it (user POV)

- Run `./bin/pstack-anywhere prepare --host <id> --desk <dir>`.
- Run `./bin/pstack-anywhere observe --host <id> --desk <dir>`.
- Run `./bin/pstack-anywhere clean --host <id> --desk <dir>`.

## Driving it with verify-pstack-anywhere

Preconditions:

- `./bin/pstack-anywhere check` is `upstream lock ok`.
- `HOST` is set. `/tmp/pstack-verify/desks/<host>` does not exist, or the last run already cleaned it.

- **Prepare.** Run `HOST=<id> .cursor/skills/verify-pstack-anywhere/scripts/drive-attach.sh`. Exit 0. `prepare.json` has `"kind": "installed"`. The desk contains that host's skill tree and card. The clone still has no host skill tree at repo root.
- **Observe.** The same script writes `observe.json` with `"kind": "observed"` and `"cardExists": true`. `AGENTS.md` on the desk tells the host to read its card.
- **Proof.** Copy `prepare.json`, `observe.json`, and a `find` listing into the evidence dir. Confirm `skills/poteto-mode/SKILL.md` in the clone is untouched.

## Gotchas

- `prepare` defaults `--home` to `<desk>/.shelf-home`. Do not export `PSTACK_HOME` to John's real home.
- `clean` removes attached skills. Drive the host before clean.
- Cleanup of the desk is a later step. Do not delete evidence.
- Each host gets its own desk. Do not attach two hosts onto one folder.
