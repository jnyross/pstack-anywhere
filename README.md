# pstack-anywhere

Install pstack skills on Cursor, Claude Code, Codex CLI, Gemini CLI, Grok CLI, Pi, or Oh My Pi without rewriting skill bodies. `skills/` and `agents/` stay byte-identical to [upstream pstack](https://github.com/cursor/plugins/tree/main/pstack). Host translation lives in a generated card.

You need [Bun](https://bun.sh).

## Install for a host

Clone this repo, then attach it to one host.

```bash
git clone https://github.com/jnyross/pstack-anywhere.git
cd pstack-anywhere
./bin/pstack-anywhere install --host cursor
```

`--host` is `cursor`, `claude-code`, `codex`, `gemini`, `grok`, `pi`, or `omp`. The default scope is `user`. To write into the current repo instead, pass `--scope project`. Droid is not a host.

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

## Attach onto a throwaway desk

Project install used to write into this clone. Pass a separate desk so a Mini host can open that folder without dirtying `pstack-anywhere`.

```bash
./bin/pstack-anywhere probe
./bin/pstack-anywhere prepare --host codex --desk /tmp/notes-shelf/inbox
./bin/pstack-anywhere observe --host codex --desk /tmp/notes-shelf/inbox
./bin/pstack-anywhere clean --host codex --desk /tmp/notes-shelf/inbox
```

`prepare` copies vendor `skills/` from this repo onto the desk. Receipts go under `--home` or `<desk>/.shelf-home`. `clean` removes only those paths. `--host` is required on `uninstall`, `prepare`, `observe`, and `clean`. `status` lists receipts. It does not write.

`probe` marks Claude `unauth` when `claude -p` is org-disabled, even if `claude auth status` says logged in. It marks Droid `unauth` when `FACTORY_API_KEY` is unset. It marks Pi `unauth` when `pi --list-models` prints no model table. It marks Oh My Pi `unauth` when `~/.omp/agent/config.yml` is missing.
