# pstack-anywhere

A Bun/TypeScript CLI that installs upstream pstack skills/agents onto a host (Cursor, Claude Code, Codex, Gemini, Grok, Pi, Oh My Pi) without rewriting skill bodies. The CLI lives in `shim/` and is launched via `bin/pstack-anywhere` (a `#!/usr/bin/env bun` shim).

## Cursor Cloud specific instructions

- Runtime is **Bun** (pinned to `1.3.14` to match `.github/workflows/check.yml`). There is no Node build step; do not run `tsc` for typechecking — `bun-types` is not a declared dependency, so standalone `tsc --noEmit` fails with `Cannot find type definition file for 'bun-types'`. Bun resolves its own types at runtime. Typecheck by running the CLI/tests instead.
- The project has **no third-party dependencies** and no committed lockfile; `bun install` reports "No packages". Nothing to install beyond Bun itself.
- Commands (see `shim/package.json` scripts and the CI workflow):
  - Tests: `bun test` run from the `shim/` directory (`cd shim && bun test`).
  - Lint/verify: `bun src/cli.ts check` from `shim/` (or `./bin/pstack-anywhere check` from the repo root). This validates the vendor lock in `.upstream.json` against `skills/` and `agents/`; it is the closest thing to a linter here.
  - Run the app: `./bin/pstack-anywhere <command>` from the repo root (`install --host <cursor|claude-code|codex|gemini|grok|pi|omp> [--scope user|project] [--dry-run]`, `uninstall`, `sync`, `doctor --host <id>`, `status`, `emit-plugin`).
- `install`/`uninstall`/`status` write under `$PSTACK_HOME` (defaults to the real home dir). When testing writes, set `PSTACK_HOME` to a throwaway dir (e.g. `PSTACK_HOME=/tmp/pstack-home`) so you don't touch the actual `~/.cursor` etc.
- `sync` and `sync --ref` fetch vendor files from the `cursor/plugins` repo over the network; skip it when offline. `check`, `test`, `doctor`, and `install --dry-run` all run fully offline.
