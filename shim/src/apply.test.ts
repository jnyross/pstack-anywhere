import { afterEach, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { install, receiptPath, uninstall } from "./apply.ts";
import { hostById } from "./hosts.ts";
import { hashFile, vendorDrift } from "./vendor.ts";

const repoRoot = join(import.meta.dir, "..", "..");
const homes: string[] = [];
const temps: string[] = [];

afterEach(() => {
  for (const h of homes) rmSync(h, { recursive: true, force: true });
  homes.length = 0;
  for (const t of temps) rmSync(t, { recursive: true, force: true });
  temps.length = 0;
});

function home(): string {
  const h = mkdtempSync(join(tmpdir(), "pstack-home-"));
  homes.push(h);
  return h;
}

function fakeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "pstack-repo-"));
  temps.push(root);
  cpSync(join(repoRoot, "skills"), join(root, "skills"), { recursive: true });
  cpSync(join(repoRoot, "agents"), join(root, "agents"), { recursive: true });
  cpSync(join(repoRoot, ".upstream.json"), join(root, ".upstream.json"));
  return root;
}

test("vendor lock matches skills and agents", () => {
  expect(vendorDrift(repoRoot)).toEqual([]);
});

test("check fails when a skill is edited", () => {
  const target = join(repoRoot, "skills/unslop/SKILL.md");
  const orig = readFileSync(target);
  writeFileSync(target, `${orig}\n`);
  try {
    const drift = vendorDrift(repoRoot);
    expect(drift.some((d) => d.path === "skills/unslop/SKILL.md" && d.reason === "changed")).toBe(true);
  } finally {
    writeFileSync(target, orig);
  }
});

test("claude install is idempotent and uninstalls", () => {
  const h = home();
  const host = hostById("claude-code");
  const first = install({ repoRoot, home: h, host, scope: "user", dryRun: false });
  const second = install({ repoRoot, home: h, host, scope: "user", dryRun: false });
  expect(second.writes).toEqual(first.writes);
  const skill = join(h, ".claude/skills/poteto-mode/SKILL.md");
  expect(existsSync(skill)).toBe(true);
  expect(hashFile(skill)).toBe(hashFile(join(repoRoot, "skills/poteto-mode/SKILL.md")));
  expect(existsSync(join(h, ".claude/agents/comment-sicko.md"))).toBe(true);
  expect(readFileSync(join(h, ".claude/CLAUDE.md"), "utf8")).toContain("pstack-anywhere:start");
  uninstall({ home: h, host, scope: "user", dryRun: false, repoRoot });
  expect(existsSync(skill)).toBe(false);
  expect(existsSync(join(h, ".claude/agents/comment-sicko.md"))).toBe(false);
});

test("codex writes toml agents", () => {
  const h = home();
  const host = hostById("codex");
  install({ repoRoot, home: h, host, scope: "user", dryRun: false });
  const toml = readFileSync(join(h, ".codex/agents/comment-sicko.toml"), "utf8");
  expect(toml).toContain('name = "comment-sicko"');
  uninstall({ home: h, host, scope: "user", dryRun: false, repoRoot });
});

test("dry-run writes nothing", () => {
  const h = home();
  install({ repoRoot, home: h, host: hostById("gemini"), scope: "user", dryRun: true });
  expect(existsSync(join(h, ".gemini"))).toBe(false);
});

test("project install keeps another worktree intact", () => {
  const h = home();
  const host = hostById("claude-code");
  const treeA = fakeRepo();
  const treeB = fakeRepo();
  install({ repoRoot: treeA, home: h, host, scope: "project", dryRun: false });
  const skillA = join(treeA, ".claude/skills/poteto-mode/SKILL.md");
  expect(existsSync(skillA)).toBe(true);
  install({ repoRoot: treeB, home: h, host, scope: "project", dryRun: false });
  expect(existsSync(skillA)).toBe(true);
  expect(existsSync(join(treeB, ".claude/skills/poteto-mode/SKILL.md"))).toBe(true);
  expect(receiptPath(h, host.id, "project", treeA)).not.toBe(receiptPath(h, host.id, "project", treeB));
  uninstall({ home: h, host, scope: "project", dryRun: false, repoRoot: treeB });
  expect(existsSync(skillA)).toBe(true);
  expect(existsSync(join(treeB, ".claude/skills/poteto-mode/SKILL.md"))).toBe(false);
});

test("reinstall removes paths a prior receipt still owned", () => {
  const h = home();
  const host = hostById("claude-code");
  install({ repoRoot, home: h, host, scope: "user", dryRun: false });
  const leftover = join(h, ".claude/skills/retired-skill");
  mkdirSync(leftover, { recursive: true });
  writeFileSync(join(leftover, "SKILL.md"), "gone\n");
  const recFile = join(h, ".pstack/receipts/claude-code-user.json");
  const rec = JSON.parse(readFileSync(recFile, "utf8")) as { paths: string[] };
  rec.paths.push(leftover);
  writeFileSync(recFile, `${JSON.stringify(rec, null, 2)}\n`);
  install({ repoRoot, home: h, host, scope: "user", dryRun: false });
  expect(existsSync(leftover)).toBe(false);
  uninstall({ home: h, host, scope: "user", dryRun: false, repoRoot });
});

test("project stub points at a repo-relative card", () => {
  const h = home();
  const tmpRepo = fakeRepo();
  const host = hostById("claude-code");
  install({ repoRoot: tmpRepo, home: h, host, scope: "project", dryRun: false });
  const stub = readFileSync(join(tmpRepo, "CLAUDE.md"), "utf8");
  expect(stub).toContain("read .claude/pstack-host.md");
  expect(stub.includes(tmpRepo)).toBe(false);
  uninstall({ home: h, host, scope: "project", dryRun: false, repoRoot: tmpRepo });
});
