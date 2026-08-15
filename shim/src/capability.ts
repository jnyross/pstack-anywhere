export type Capability =
  | "subagent.spawn"
  | "subagent.customDefs"
  | "subagent.model"
  | "subagent.background"
  | "subagent.cloud"
  | "subagent.resume"
  | "subagent.generalPurpose"
  | "mcp"
  | "askQuestion"
  | "shell.background"
  | "shell.outputWake"
  | "worktrees"
  | "slashCommands"
  | "skillAutoInvoke"
  | "todolist"
  | "transcripts"
  | "external.teamKit";

export type CapabilityTier = "core" | "full_rigor" | "luxury";

export const capabilityTiers = {
  "subagent.spawn": "core",
  "subagent.customDefs": "core",
  "subagent.model": "full_rigor",
  "subagent.background": "full_rigor",
  "subagent.cloud": "luxury",
  "subagent.resume": "luxury",
  "subagent.generalPurpose": "core",
  mcp: "full_rigor",
  askQuestion: "luxury",
  "shell.background": "full_rigor",
  "shell.outputWake": "full_rigor",
  worktrees: "full_rigor",
  slashCommands: "core",
  skillAutoInvoke: "core",
  todolist: "core",
  transcripts: "luxury",
  "external.teamKit": "luxury",
} as const satisfies Record<Capability, CapabilityTier>;

export const capabilityEvidence: Record<Capability, readonly string[]> = {
  "subagent.spawn": ["subagent_type", "Task"],
  "subagent.customDefs": ['subagent_type: "poteto-agent"', "Comment Sicko"],
  "subagent.model": ["model:", "pstack-models.mdc"],
  "subagent.background": ["run_in_background"],
  "subagent.cloud": ['environment: "cloud"'],
  "subagent.resume": ["resume:"],
  "subagent.generalPurpose": ["generalPurpose"],
  mcp: ["MCP", "GetMcpTools"],
  askQuestion: ["AskQuestion"],
  "shell.background": ["/loop"],
  "shell.outputWake": ["/loop", "notify_on_output"],
  worktrees: ["worktree"],
  slashCommands: ["/poteto-mode"],
  skillAutoInvoke: ["disable-model-invocation"],
  todolist: ["todolist"],
  transcripts: ["agent-transcripts"],
  "external.teamKit": ["/deslop", "control-ui", "control-cli"],
};

export type Binding =
  | { readonly kind: "native"; readonly howTo: string }
  | { readonly kind: "emulated"; readonly howTo: string; readonly cost: string }
  | {
      readonly kind: "absent";
      readonly instead: string;
      readonly affects: readonly string[];
      readonly catalog?: string;
    };

export type CapabilityTable = Readonly<Record<Capability, Binding>>;

export type HostId = "cursor" | "claude-code" | "codex" | "gemini" | "grok" | "pi" | "omp";
export type Scope = "user" | "project";
export type Attach = "copy" | "symlink-tree";
export type AgentFormat = "verbatim-md" | "claude-md" | "codex-toml";

export type AgentSupport =
  | { readonly kind: "none"; readonly instead: string }
  | {
      readonly kind: "files";
      readonly format: AgentFormat;
      readonly userDir: string;
      readonly projectDir: string;
    };

export type HostProfile = {
  readonly id: HostId;
  readonly displayName: string;
  readonly attach: Attach;
  readonly userSkillsParent: string;
  readonly projectSkillsParent: string;
  readonly userCard: string;
  readonly projectCard: string;
  readonly userStub: string | null;
  readonly projectStub: string | null;
  readonly agents: AgentSupport;
  readonly agentAliases: Readonly<Record<string, string>>;
  readonly capabilities: CapabilityTable;
};

export const MODELS_LITERAL = "~/.cursor/rules/pstack-models.mdc";
export const MODELS_OWNED = "~/.pstack/models.md";
