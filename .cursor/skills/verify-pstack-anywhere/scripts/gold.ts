export const GOLD_HOSTS = ["codex", "grok", "pi", "omp"] as const;
export type GoldHost = (typeof GOLD_HOSTS)[number];

export const GOLD_PROMPT =
  "Add a greet(name) export in src/greet.ts that returns Hello, <name>. Add a one-line bun:test. Keep the change tiny.";

export type HostLayout = {
  readonly id: GoldHost;
  readonly card: string;
  readonly skill: string;
  readonly stubNeedle: string;
};

export const HOST_LAYOUTS: readonly HostLayout[] = [
  {
    id: "codex",
    card: ".codex/pstack-host.md",
    skill: ".agents/skills/poteto-mode/SKILL.md",
    stubNeedle: "read .codex/pstack-host.md",
  },
  {
    id: "grok",
    card: ".grok/pstack-host.md",
    skill: ".grok/skills/poteto-mode/SKILL.md",
    stubNeedle: "read .grok/pstack-host.md",
  },
  {
    id: "pi",
    card: ".pi/pstack-host.md",
    skill: ".pi/skills/poteto-mode/SKILL.md",
    stubNeedle: "read .pi/pstack-host.md",
  },
  {
    id: "omp",
    card: ".omp/pstack-host.md",
    skill: ".omp/skills/poteto-mode/SKILL.md",
    stubNeedle: "read .omp/pstack-host.md",
  },
];

export function layoutFor(host: string): HostLayout {
  const row = HOST_LAYOUTS.find((h) => h.id === host);
  if (!row) throw new Error(`unknown gold host: ${host}`);
  return row;
}

export type GoldKind = "passed_gold_task" | "failed_gold_task" | "failed_to_start";

export type GoldGrade = {
  readonly host: string;
  readonly kind: GoldKind;
  readonly greet: boolean;
  readonly greetAda: string | null;
  readonly bunTestExit: number | null;
  readonly logBytes: number;
};

export function greetMatchesGold(value: string | null): boolean {
  if (value === null) return false;
  return value === "Hello, Ada" || value === "Hello, Ada.";
}

export function classifyGold(opts: {
  readonly greetAda: string | null;
  readonly bunTestExit: number | null;
  readonly logBytes: number;
  readonly greetFile: boolean;
}): GoldKind {
  if (!opts.greetFile && opts.logBytes === 0) return "failed_to_start";
  if (greetMatchesGold(opts.greetAda) && opts.bunTestExit === 0) return "passed_gold_task";
  return "failed_gold_task";
}
