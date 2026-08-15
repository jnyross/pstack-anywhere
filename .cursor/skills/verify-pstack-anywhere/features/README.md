# pstack-anywhere verification map

This directory is the maintained source for verifying user-facing CLI behavior. Read this index before driving, then use the matching feature file.

## Baseline preconditions

- Work from a pstack-anywhere checkout whose `./bin/pstack-anywhere check` prints `upstream lock ok`.
- Bun 1.3.x is on `PATH`.
- `scripts/doctor.sh` exits 0 before any gold-compare drive.
- Desks are under `/tmp/pstack-verify/desks/<host>/`. Never attach onto the clone itself.
- Evidence is under `/tmp/pstack-verify/evidence/<run-id>/`.
- Never drive a Codex process that uses John's default `~/.codex/config.toml`.
- Never drive a Grok process that uses John's default `~/.grok/config.toml`.

## Driving conventions

- Start every recipe from a fresh desk unless the feature says otherwise.
- Treat every command as literal.
- Run attach and host drives through the committed helpers.
- Restore nothing in `$HOME`. Cleanup removes desks and runtime copies only.
- Run one host at a time. Hosts do not share a desk.

## Proof and skip reporting

- CLI proof includes the command, stdout, stderr, and exit code.
- Host proof includes `host.log` plus `grade.json`.
- Mutation proof includes a second look at the desk (`desk-tree.txt` and the greet file).
- Record the feature id with every artifact.
- Report an unreachable host with the `probe` row and stop. Do not claim a missing host passed through a different binary.

## Features

- [Attach a desk](./attach-desk.md) covers prepare, observe, and clean on a throwaway folder.
- [Probe Mini hosts](./probe-hosts.md) covers found, missing, and unauth rows.
- [Gold compare](./gold-compare.md) covers Codex, then Grok, Pi, and Oh My Pi on the same greet task.
