import { readFileSync } from "node:fs";
import { join } from "node:path";
import { capabilityTiers, MODELS_LITERAL, MODELS_OWNED, type HostProfile } from "./capability.ts";
import { loadLock } from "./vendor.ts";

const MARKER = "pstack-anywhere";

export function stubBlock(cardPath: string): string {
  return [
    `<!-- ${MARKER}:start -->`,
    `Before using a pstack skill, read ${cardPath}.`,
    "That file maps Cursor vocabulary (Task, poteto-agent, Comment Sicko, /loop) to this host.",
    `<!-- ${MARKER}:end -->`,
  ].join("\n");
}

export function mergeStub(existing: string | null, cardPath: string): string {
  const block = stubBlock(cardPath);
  const re = new RegExp(`<!-- ${MARKER}:start -->[\\s\\S]*?<!-- ${MARKER}:end -->`);
  if (!existing || existing.trim() === "") return `${block}\n`;
  if (re.test(existing)) return existing.replace(re, block);
  return `${existing.replace(/\s*$/, "")}\n\n${block}\n`;
}

export function stripStub(existing: string): string {
  const re = new RegExp(`\\n*<!-- ${MARKER}:start -->[\\s\\S]*?<!-- ${MARKER}:end -->\\n*`);
  return existing.replace(re, "\n").trimEnd() + (existing.endsWith("\n") ? "\n" : "");
}

export function modelsSeed(): string {
  return `# pstack model roles. inherit-parent until /setup-pstack confirms real slugs.
feature, refactoring: inherit-parent
bug-fix: inherit-parent
judgment and prose: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
arena runners: inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent
interrogate reviewers: inherit-parent
`;
}

export function renderCard(repoRoot: string, host: HostProfile): string {
  const lock = loadLock(repoRoot);
  const lines: string[] = [
    `# pstack host card — ${host.displayName}`,
    "",
    `Upstream ${lock.version} @ ${lock.commit.slice(0, 12)}.`,
    "Do not edit files under skills/. This card is the only translation.",
    "",
    "## Agent names",
    "",
  ];
  for (const [logical, actual] of Object.entries(host.agentAliases)) {
    lines.push(`- When a skill says \`${logical}\`, spawn \`${actual}\`.`);
  }
  lines.push("", "## Paths", "");
  lines.push(`- Role table: write ${MODELS_LITERAL}. It is a bridge to ${MODELS_OWNED}.`);
  lines.push("", "## Capabilities", "");
  for (const [id, binding] of Object.entries(host.capabilities)) {
    const tier = capabilityTiers[id as keyof typeof capabilityTiers];
    if (binding.kind === "native") {
      lines.push(`- **${id}** (${tier}, native). ${binding.howTo}`);
    } else if (binding.kind === "emulated") {
      lines.push(`- **${id}** (${tier}, emulated). ${binding.howTo} Cost: ${binding.cost}`);
    } else {
      lines.push(`- **${id}** (${tier}, absent). ${binding.instead}`);
      if (binding.affects.length) lines.push(`  Reduced: ${binding.affects.join(", ")}`);
    }
  }
  if (host.agents.kind === "none") {
    const poteto = readFileSync(join(repoRoot, "agents/poteto-agent.md"), "utf8");
    const sicko = readFileSync(join(repoRoot, "agents/comment-sicko.md"), "utf8");
    lines.push("", "## Bundled agent bodies", "", "### poteto-agent", "", poteto, "", "### Comment Sicko", "", sicko);
  }
  lines.push("");
  return lines.join("\n");
}

export function renderClaudeAgent(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body.trim()}\n`;
}

export function renderCodexAgent(name: string, description: string, body: string): string {
  const escaped = body.replaceAll("\\", "\\\\").replaceAll('"""', '\\"""');
  return `name = "${name}"\ndescription = "${description}"\ndeveloper_instructions = """\n${escaped}\n"""\n`;
}

export function cursorPluginJson(): string {
  return `${JSON.stringify(
    {
      name: "pstack-anywhere",
      displayName: "pstack-anywhere",
      version: "0.14.1",
      description:
        "Portable pstack. Skills stay byte-identical to upstream. Host adapters live beside them.",
      author: { name: "Lauren Tan" },
      homepage: "https://github.com/jnyross/pstack-anywhere",
      repository: "https://github.com/jnyross/pstack-anywhere",
      license: "MIT",
      keywords: ["pstack", "poteto-mode", "workflow"],
      category: "developer-tools",
      tags: ["workflow", "principles"],
      skills: "./skills/",
      agents: "./agents/",
    },
    null,
    "\t",
  )}\n`;
}
