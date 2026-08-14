# pstack-anywhere

Portable packaging for the Cursor `pstack` skills. The 44 canonical skills
remain under `skills/`; `bin/pstack-anywhere` installs them into major coding
agents without forking their text.

## quickstart

```bash
git clone https://github.com/jnyross/pstack-anywhere.git
cd pstack-anywhere
python3 bin/pstack-anywhere list-hosts
python3 bin/pstack-anywhere install --host claude-code --scope user
```

Use `--scope project --project-dir /path/to/repo` for repository-local
installation. `--host auto` probes host directories and installs into every
detected host. Add `--dry-run` to preview changes and `--force` to replace
existing skill directories. Re-running is idempotent.

Native `SKILL.md` hosts (Claude Code, Codex, and generic) receive skill
directories. Gemini CLI, Copilot, Windsurf, Cline, and opencode receive thin
pointer commands that direct the agent to the canonical absolute `SKILL.md`.
Instruction files contain a replaceable `pstack-anywhere` marker block, so
unrelated content is preserved.

## hosts

| host | project skills or commands | instructions | parallel/background |
| --- | --- | --- | --- |
| cursor | `.cursor/skills/` | `.cursor/rules/` | Task, model selection, background |
| claude-code | `.claude/skills/` | `CLAUDE.md` | Task, model selection, background |
| codex | `.agents/skills/` | `AGENTS.md` | documented degradation |
| gemini-cli | `.gemini/commands/*.toml` | `GEMINI.md` | documented degradation |
| copilot | `.github/prompts/*.prompt.md` | `.github/copilot-instructions.md` | documented degradation |
| windsurf | `.windsurf/workflows/*.md` | `.windsurf/rules/` | documented degradation |
| cline | `.clinerules/workflows/*.md` | `.clinerules/` | documented degradation |
| opencode | `.opencode/commands/*.md` | `AGENTS.md` | documented degradation |
| generic | `.agents/skills/` | `AGENTS.md` | host contract |

See [`shim/CAPABILITIES.md`](shim/CAPABILITIES.md) for the complete capability
contract and explicit degradations. `doctor` prints it for every adapter and
calls out hosts without transcript history; recall, reflect, and automate-me
are unavailable there rather than pretending a transcript path exists.

## uninstall

```bash
python3 bin/pstack-anywhere uninstall --host claude-code --scope user
```

The installer records only its own artifacts, removes its instruction marker,
and does not overwrite unrelated instruction content.

## adding a host

Add one descriptor to `adapters/`. It declares skill and command locations,
pointer format, instruction path, model configuration, probes, rewrites, and
capabilities. Add a small emitter in `bin/pstack-anywhere` only when the host
needs a format not already supported (TOML, Copilot prompt, or markdown).
Document any unverified primitive as a degradation.

## source and license

Copied from the Cursor public pstack plugin cache
(`cursor/plugins` → `pstack`), skills only. Upstream author:
[Lauren Tan (poteto)](https://x.com/poteto). License remains MIT; see
[`LICENSE`](LICENSE).
