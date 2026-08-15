import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { MODELS_LITERAL, MODELS_OWNED, type HostProfile, type Scope } from "./capability.ts";
import { mergeStub, modelsSeed, renderCard, renderClaudeAgent, renderCodexAgent, stripStub } from "./card.ts";
import { expand } from "./paths.ts";
import { skillDirs } from "./vendor.ts";

export type Receipt = {
  schema: 1;
  host: string;
  scope: Scope;
  paths: string[];
  stubs: string[];
};

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function writeFile(path: string, body: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, body);
}

function copyTree(from: string, to: string): void {
  ensureDir(dirname(to));
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

function agentBody(repoRoot: string, file: string): { name: string; description: string; body: string } {
  const raw = readFileSync(join(repoRoot, "agents", file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`bad agent frontmatter: ${file}`);
  const name = /name:\s*(.+)/.exec(m[1])?.[1]?.trim() ?? file;
  const description = /description:\s*(.+)/.exec(m[1])?.[1]?.trim() ?? "";
  return { name, description, body: m[2] };
}

function projectReceiptKey(repoRoot: string): string {
  return createHash("sha256").update(resolve(repoRoot)).digest("hex").slice(0, 16);
}

export function receiptPath(home: string, host: string, scope: Scope, repoRoot?: string): string {
  if (scope === "project") {
    if (!repoRoot) throw new Error("project receipts require repoRoot");
    return join(home, ".pstack", "receipts", `${host}-${scope}-${projectReceiptKey(repoRoot)}.json`);
  }
  return join(home, ".pstack", "receipts", `${host}-${scope}.json`);
}

export function install(opts: {
  repoRoot: string;
  home: string;
  host: HostProfile;
  scope: Scope;
  dryRun: boolean;
  attachRoot?: string;
}): { receipt: Receipt; writes: string[] } {
  const { repoRoot, home, host, scope, dryRun } = opts;
  const attachRoot = opts.attachRoot ?? repoRoot;
  const skillsParent = expand(scope === "user" ? host.userSkillsParent : host.projectSkillsParent, home, attachRoot);
  const cardPath = expand(scope === "user" ? host.userCard : host.projectCard, home, attachRoot);
  const stubCardPath =
    scope === "project" ? relative(attachRoot, cardPath).replaceAll("\\", "/") : cardPath;
  const stubTpl = scope === "user" ? host.userStub : host.projectStub;
  const stubPath = stubTpl ? expand(stubTpl, home, attachRoot) : null;
  const modelsOwned = expand(MODELS_OWNED, home, attachRoot);
  const modelsBridge = expand(MODELS_LITERAL, home, attachRoot);
  const writes: string[] = [];
  const stubs: string[] = [];
  const prevRecFile = receiptPath(home, host.id, scope, attachRoot);
  const prevRec =
    existsSync(prevRecFile) ? (JSON.parse(readFileSync(prevRecFile, "utf8")) as Receipt) : null;

  const planned: Array<() => void> = [];

  for (const dir of skillDirs(repoRoot)) {
    const dest = join(skillsParent, dir);
    writes.push(dest);
    planned.push(() => copyTree(join(repoRoot, "skills", dir), dest));
  }

  writes.push(cardPath);
  planned.push(() => writeFile(cardPath, renderCard(repoRoot, host)));

  if (stubPath) {
    stubs.push(stubPath);
    planned.push(() => {
      const prev = existsSync(stubPath) ? readFileSync(stubPath, "utf8") : null;
      writeFile(stubPath, mergeStub(prev, stubCardPath));
    });
  }

  planned.push(() => {
    if (!existsSync(modelsOwned)) writeFile(modelsOwned, modelsSeed());
  });
  planned.push(() => {
    if (!existsSync(modelsBridge)) {
      const body = existsSync(modelsOwned) ? readFileSync(modelsOwned, "utf8") : modelsSeed();
      writeFile(modelsBridge, body);
    }
  });

  if (host.agents.kind === "files") {
    const agentDir = expand(scope === "user" ? host.agents.userDir : host.agents.projectDir, home, attachRoot);
    const specs = [
      { file: "poteto-agent.md", logical: "poteto-agent" },
      { file: "comment-sicko.md", logical: "Comment Sicko" },
    ];
    for (const spec of specs) {
      const parsed = agentBody(repoRoot, spec.file);
      const alias = host.agentAliases[spec.logical] ?? parsed.name;
      const dest =
        host.agents.format === "codex-toml"
          ? join(agentDir, `${alias}.toml`)
          : join(agentDir, `${alias}.md`);
      writes.push(dest);
      planned.push(() => {
        if (host.agents.kind !== "files") return;
        if (host.agents.format === "codex-toml") {
          writeFile(dest, renderCodexAgent(alias, parsed.description, parsed.body));
        } else if (host.agents.format === "claude-md") {
          writeFile(dest, renderClaudeAgent(alias, parsed.description, parsed.body));
        } else {
          writeFile(dest, readFileSync(join(repoRoot, "agents", spec.file), "utf8"));
        }
      });
    }
    if (host.agentAliases.generalPurpose && host.agentAliases.generalPurpose !== "generalPurpose") {
      const alias = host.agentAliases.generalPurpose;
      const dest =
        host.agents.format === "codex-toml" ? join(agentDir, `${alias}.toml`) : join(agentDir, `${alias}.md`);
      const description = "Generic worker for pstack panel skills that ask for generalPurpose.";
      const body =
        "You are a general-purpose subagent. Follow the parent brief. Do not skip poteto-mode when the parent says to use it.";
      writes.push(dest);
      planned.push(() => {
        if (host.agents.kind !== "files") return;
        if (host.agents.format === "codex-toml") {
          writeFile(dest, renderCodexAgent(alias, description, body));
        } else {
          writeFile(dest, renderClaudeAgent(alias, description, body));
        }
      });
    }
  }

  const writeSet = new Set(writes);
  const stubSet = new Set(stubs);
  if (prevRec) {
    for (const p of prevRec.paths) {
      if (p === prevRecFile || writeSet.has(p)) continue;
      planned.push(() => {
        if (existsSync(p)) rmSync(p, { recursive: true, force: true });
      });
    }
    for (const stub of prevRec.stubs) {
      if (stubSet.has(stub)) continue;
      planned.push(() => {
        if (!existsSync(stub)) return;
        writeFileSync(stub, stripStub(readFileSync(stub, "utf8")));
      });
    }
  }

  const rec: Receipt = { schema: 1, host: host.id, scope, paths: writes, stubs };
  const recFile = receiptPath(home, host.id, scope, attachRoot);
  writes.push(recFile);
  planned.push(() => writeFile(recFile, `${JSON.stringify(rec, null, 2)}\n`));

  if (!dryRun) for (const step of planned) step();
  return { receipt: rec, writes };
}

export function uninstall(opts: {
  home: string;
  host: HostProfile;
  scope: Scope;
  dryRun: boolean;
  repoRoot: string;
}): string[] {
  const recFile = receiptPath(opts.home, opts.host.id, opts.scope, opts.repoRoot);
  if (!existsSync(recFile)) return [];
  const rec = JSON.parse(readFileSync(recFile, "utf8")) as Receipt;
  const removed: string[] = [];
  if (!opts.dryRun) {
    for (const stub of rec.stubs) {
      if (!existsSync(stub)) continue;
      writeFileSync(stub, stripStub(readFileSync(stub, "utf8")));
      removed.push(stub);
    }
    for (const p of rec.paths) {
      if (p === recFile) continue;
      if (existsSync(p)) {
        rmSync(p, { recursive: true, force: true });
        removed.push(p);
      }
    }
    rmSync(recFile, { force: true });
    removed.push(recFile);
  } else {
    removed.push(...rec.paths, ...rec.stubs);
  }
  return removed;
}
