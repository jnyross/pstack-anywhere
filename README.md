# pstack-anywhere

Install pstack skills on Cursor, Claude Code, Codex CLI, or Gemini CLI without rewriting skill bodies. `skills/` and `agents/` stay byte-identical to [upstream pstack](https://github.com/cursor/plugins/tree/main/pstack). Host translation lives in a generated card.

You need [Bun](https://bun.sh).

## Install for a host

Clone this repo, then attach it to one host.

```bash
git clone https://github.com/jnyross/pstack-anywhere.git
cd pstack-anywhere
./bin/pstack-anywhere install --host cursor
```

`--host` is `cursor`, `claude-code`, `codex`, or `gemini`. The default scope is `user`. To write into the current repo instead, pass `--scope project`.

To preview writes, add `--dry-run`.

Cursor can also load this folder as a local plugin. `.cursor-plugin/plugin.json` points at `./skills/` and `./agents/`.

## Refresh from upstream

`sync` fetches `skills/` and `agents/` from `cursor/plugins` and rewrites `.upstream.json`. It does not touch `shim/`.

```bash
./bin/pstack-anywhere sync
```

To pin a commit or branch, pass `--ref`. To print the plan without writing, pass `--dry-run`.

If a file under `skills/` or `agents/` was edited by hand, `sync` refuses and prints the path. Restore the file from git, then run `sync` again.

## Check the vendor lock

```bash
./bin/pstack-anywhere check
```

`check` fails when a vendor file drifted from `.upstream.json`, a degrade catalog id is missing, or an `absent.affects` path does not exist.

## Remove an install

```bash
./bin/pstack-anywhere uninstall --host cursor
```

Uninstall reads the receipt under `$PSTACK_HOME/.pstack/receipts/` and removes only the paths it wrote. Shared files you already had, such as `CLAUDE.md` outside the stub markers, stay.

## See what a host can do

```bash
./bin/pstack-anywhere doctor --host claude-code
```

`doctor` prints each capability as native, emulated, or absent. Absent rows point at a catalog note under `shim/catalog/degrades/`.
