import { existsSync } from "node:fs";
import { join } from "node:path";
import { capabilityTiers, type Capability, type HostProfile } from "./capability.ts";

export type ProfileError =
  | { readonly kind: "unknown-catalog"; readonly capability: Capability; readonly catalog: string }
  | { readonly kind: "unknown-affects"; readonly capability: Capability; readonly path: string };

function isCapability(id: string): id is Capability {
  return Object.hasOwn(capabilityTiers, id);
}

export function validateProfile(opts: { host: HostProfile; repoRoot: string }): ProfileError[] {
  const errors: ProfileError[] = [];
  for (const [id, binding] of Object.entries(opts.host.capabilities)) {
    if (!isCapability(id) || binding.kind !== "absent") continue;
    if (binding.catalog) {
      const doc = join(opts.repoRoot, "shim/catalog/degrades", `${binding.catalog}.md`);
      if (!existsSync(doc)) {
        errors.push({ kind: "unknown-catalog", capability: id, catalog: binding.catalog });
      }
    }
    for (const path of binding.affects) {
      if (!existsSync(join(opts.repoRoot, path))) {
        errors.push({ kind: "unknown-affects", capability: id, path });
      }
    }
  }
  return errors;
}

const loopAffects = [
  "skills/poteto-mode/playbooks/babysit.md",
  "skills/poteto-mode/playbooks/autonomous-run.md",
  "skills/poteto-mode/playbooks/shipping.md",
  "skills/poteto-mode/playbooks/orchestrate.md",
] as const;

const cloudAffects = [
  "skills/swarm/SKILL.md",
  "skills/poteto-mode/playbooks/orchestrate.md",
  "skills/poteto-mode/playbooks/autopilot-full.md",
] as const;

const transcriptAffects = [
  "skills/recall/SKILL.md",
  "skills/reflect/SKILL.md",
  "skills/poteto-mode/scripts/worktree-audit.sh",
] as const;

function cursorCaps(): CapabilityTable {
  return {
    "subagent.spawn": { kind: "native", howTo: "Use the Task tool." },
    "subagent.customDefs": {
      kind: "native",
      howTo: "Spawn poteto-agent and Comment Sicko by those exact names.",
    },
    "subagent.model": {
      kind: "native",
      howTo: "Pass model: from ~/.cursor/rules/pstack-models.mdc or inherit-parent.",
    },
    "subagent.background": { kind: "native", howTo: "run_in_background: true." },
    "subagent.cloud": { kind: "native", howTo: 'environment: "cloud".' },
    "subagent.resume": { kind: "native", howTo: "Task resume. Prefer a fresh spawn if directives dropped." },
    "subagent.generalPurpose": { kind: "native", howTo: "subagent_type: generalPurpose." },
    mcp: { kind: "native", howTo: "GetMcpTools / CallMcpTool. Skip and report if a server is missing." },
    askQuestion: { kind: "native", howTo: "AskQuestion for product calls only." },
    "shell.background": { kind: "native", howTo: "Background shell via /loop." },
    "shell.outputWake": { kind: "native", howTo: "notify_on_output on a unique sentinel." },
    worktrees: { kind: "native", howTo: "git worktree. Fallback /tmp if needed." },
    slashCommands: { kind: "native", howTo: "/poteto-mode and other skill slashes." },
    skillAutoInvoke: {
      kind: "native",
      howTo: "Honor disable-model-invocation. poteto-mode uses mode + reminder.",
    },
    todolist: { kind: "native", howTo: "Keep a todo list. First item is the principles read." },
    transcripts: { kind: "native", howTo: "~/.cursor/projects/<slug>/agent-transcripts/." },
    "external.teamKit": {
      kind: "absent",
      instead: "Skip /deslop and control-*. Run unslop. Say so in the PR.",
      affects: ["skills/poteto-mode/SKILL.md"],
      catalog: "skip-team-kit",
    },
  };
}

function claudeCaps(): CapabilityTable {
  return {
    "subagent.spawn": { kind: "native", howTo: "Use Claude Code's Task / agent spawn." },
    "subagent.customDefs": {
      kind: "native",
      howTo: "Spawn the installed Claude agents. Map Comment Sicko to comment-sicko.",
    },
    "subagent.model": {
      kind: "emulated",
      howTo: "Use inherit-parent unless /setup-pstack wrote confirmed slugs.",
      cost: "Panels collapse to one model until roles are set.",
    },
    "subagent.background": { kind: "native", howTo: "Background agents when the host supports them." },
    "subagent.cloud": {
      kind: "absent",
      instead: "Spawn local agents. No cloud VM isolation.",
      affects: [...cloudAffects],
      catalog: "no-cloud",
    },
    "subagent.resume": {
      kind: "emulated",
      howTo: "Fresh spawn with a consolidated brief.",
      cost: "Resume-chaining drops directives.",
    },
    "subagent.generalPurpose": {
      kind: "emulated",
      howTo: "Use the installed general-purpose agent, or the default worker.",
      cost: "Name may differ from generalPurpose.",
    },
    mcp: { kind: "native", howTo: "Use Claude MCP. Skip and report missing servers." },
    askQuestion: {
      kind: "emulated",
      howTo: "Ask in chat. Default if the user is away.",
      cost: "No structured AskQuestion UI.",
    },
    "shell.background": { kind: "native", howTo: "Background bash." },
    "shell.outputWake": {
      kind: "absent",
      instead: "Re-run the poll step on the next user turn. Do not fake a session inject.",
      affects: [...loopAffects],
      catalog: "no-output-wake",
    },
    worktrees: { kind: "native", howTo: "git worktree." },
    slashCommands: { kind: "native", howTo: "/poteto-mode after skills are linked." },
    skillAutoInvoke: {
      kind: "emulated",
      howTo: "Honor disable-model-invocation if present. The stub reminder is the standing entry.",
      cost: "Hosts that ignore the key may auto-fire 39 skills.",
    },
    todolist: { kind: "emulated", howTo: "A markdown checklist in the session.", cost: "No TodoWrite." },
    transcripts: {
      kind: "absent",
      instead: "Ask the user for prior context. Do not treat missing transcripts as prune-safe.",
      affects: [...transcriptAffects],
      catalog: "no-transcripts",
    },
    "external.teamKit": {
      kind: "absent",
      instead: "Skip /deslop and control-*. Run unslop.",
      affects: ["skills/poteto-mode/SKILL.md"],
      catalog: "skip-team-kit",
    },
  };
}

function codexCaps(): CapabilityTable {
  return {
    ...claudeCaps(),
    "subagent.spawn": { kind: "native", howTo: "Spawn a Codex subagent." },
    "subagent.customDefs": {
      kind: "native",
      howTo: "Use ~/.codex/agents/*.toml. Comment Sicko is comment-sicko.",
    },
    slashCommands: { kind: "emulated", howTo: "Invoke skills by name or $skill.", cost: "Slash UX differs." },
  };
}

function geminiCaps(): CapabilityTable {
  return {
    ...claudeCaps(),
    "subagent.customDefs": {
      kind: "absent",
      instead: "Read agents/*.md as reference. Put their bodies in the spawn prompt.",
      affects: ["skills/poteto-mode/SKILL.md", "skills/no-comments/SKILL.md"],
      catalog: "no-custom-agents",
    },
    slashCommands: { kind: "native", howTo: "/poteto-mode after Gemini skill discovery." },
  };
}

export const hosts: readonly HostProfile[] = [
  {
    id: "cursor",
    displayName: "Cursor",
    attach: "copy",
    userSkillsParent: "~/.cursor/skills",
    projectSkillsParent: "{repo}/.cursor/skills",
    userCard: "~/.cursor/rules/pstack-host.mdc",
    projectCard: "{repo}/.cursor/rules/pstack-host.mdc",
    userStub: null,
    projectStub: null,
    agents: {
      kind: "files",
      format: "verbatim-md",
      userDir: "~/.cursor/agents",
      projectDir: "{repo}/.cursor/agents",
    },
    agentAliases: {
      "poteto-agent": "poteto-agent",
      "Comment Sicko": "Comment Sicko",
      generalPurpose: "generalPurpose",
    },
    capabilities: cursorCaps(),
  },
  {
    id: "claude-code",
    displayName: "Claude Code",
    attach: "copy",
    userSkillsParent: "~/.claude/skills",
    projectSkillsParent: "{repo}/.claude/skills",
    userCard: "~/.claude/pstack-host.md",
    projectCard: "{repo}/.claude/pstack-host.md",
    userStub: "~/.claude/CLAUDE.md",
    projectStub: "{repo}/CLAUDE.md",
    agents: {
      kind: "files",
      format: "claude-md",
      userDir: "~/.claude/agents",
      projectDir: "{repo}/.claude/agents",
    },
    agentAliases: {
      "poteto-agent": "poteto-agent",
      "Comment Sicko": "comment-sicko",
      generalPurpose: "general-purpose",
    },
    capabilities: claudeCaps(),
  },
  {
    id: "codex",
    displayName: "Codex CLI",
    attach: "copy",
    userSkillsParent: "~/.agents/skills",
    projectSkillsParent: "{repo}/.agents/skills",
    userCard: "~/.codex/pstack-host.md",
    projectCard: "{repo}/.codex/pstack-host.md",
    userStub: "~/.codex/AGENTS.md",
    projectStub: "{repo}/AGENTS.md",
    agents: {
      kind: "files",
      format: "codex-toml",
      userDir: "~/.codex/agents",
      projectDir: "{repo}/.codex/agents",
    },
    agentAliases: {
      "poteto-agent": "poteto-agent",
      "Comment Sicko": "comment-sicko",
      generalPurpose: "general-purpose",
    },
    capabilities: codexCaps(),
  },
  {
    id: "gemini",
    displayName: "Gemini CLI",
    attach: "copy",
    userSkillsParent: "~/.gemini/skills",
    projectSkillsParent: "{repo}/.gemini/skills",
    userCard: "~/.gemini/pstack-host.md",
    projectCard: "{repo}/.gemini/pstack-host.md",
    userStub: "~/.gemini/GEMINI.md",
    projectStub: "{repo}/GEMINI.md",
    agents: { kind: "none", instead: "Bundle agent bodies in the card. No custom agent files." },
    agentAliases: {
      "poteto-agent": "poteto-agent",
      "Comment Sicko": "Comment Sicko",
      generalPurpose: "generalPurpose",
    },
    capabilities: geminiCaps(),
  },
];

export function hostById(id: string): HostProfile {
  const h = hosts.find((x) => x.id === id);
  if (!h) throw new Error(`unknown host: ${id}`);
  return h;
}
