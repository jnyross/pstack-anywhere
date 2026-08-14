# pstack capability contract

The skills use a small abstract contract rather than requiring one vendor's
agent API:

- **parallel subagents:** fan out independent reviewers or workers, with a
  model selected per child;
- **background subagents:** let long-running work continue while the parent
  handles another unit;
- **read-only subagents:** review or investigate without allowing writes;
- **per-role model configuration:** a persistent file that overrides inline
  defaults;
- **chat history:** a host-provided transcript path, when one exists;
- **worktrees:** a host-provided worktree location, when one exists;
- **multiple-choice questions:** ask the user structured choices instead of
  requiring free-form answers;
- **skill authoring:** a project or user directory where new skills can be
  written.

The adapter's `capabilities` object is the source of truth used by the CLI and
is summarized in each host's always-on instruction file. The model config is
always the existing line-based `role: model` shape; only its host-specific
filename changes. "unverified" and
"unavailable" are intentional degradations: skills that need that primitive
must use sequential passes or be treated as unavailable, rather than
inventing a path or pretending a tool exists. In particular, recall, reflect,
and automate-me are unavailable on hosts without on-disk transcript history.

Native `SKILL.md` hosts (Claude Code, Codex, and generic) receive copied skill
directories. Other hosts receive one thin command/workflow/prompt pointer per
skill. The pointer names a rewritten absolute `SKILL.md` in the shim-owned
XDG data staging directory, so the skill text has one canonical source in git
and one refreshed host-specific runtime copy.
