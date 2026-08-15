# Probe Mini hosts

Probe prints one row per Mini binary. A row is found, missing, or unauth with a reason.

## Sub-features

- `probe-found` prints `found` and a path for a logged-in host.
- `probe-unauth-claude` prints `unauth` when `claude -p` is org-disabled.
- `probe-unauth-droid` prints `unauth` when `FACTORY_API_KEY` is unset.
- `probe-unauth-pi` prints `unauth` when `pi --list-models` prints no model table.
- `probe-unauth-omp` prints `unauth` when `~/.omp/agent/config.yml` is missing.

## How to get to it (user POV)

- Run `./bin/pstack-anywhere probe`.

## Driving it with verify-pstack-anywhere

Preconditions:

- `scripts/doctor.sh` is the gold-compare gate. This feature can run doctor itself.

- **Doctor.** Run `.cursor/skills/verify-pstack-anywhere/scripts/doctor.sh`. Exit 0. `doctor.txt` in evidence contains `found` rows for `codex`, `grok`, `pi`, and `omp`.
- **Claude skip.** If a `claude` binary exists, the probe output contains `unauth	claude` when print is org-disabled, even if `claude auth status` says max.
- **Droid skip.** If a `droid` binary exists and `FACTORY_API_KEY` is unset, the probe output contains `unauth	droid` and `FACTORY_API_KEY is unset`.
- **Proof.** Keep `doctor.txt`. A missing gold host is a stop, not a pass through another binary.

## Gotchas

- `claude auth status` JSON is not the print CLI. Probe must have run `claude -p`.
- A `found` Droid row without a key is a probe bug. Do not drive Droid.
- Gemini is not part of gold-compare until someone adds a HostId drive for it.
