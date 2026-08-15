import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clean, observe, prepare } from "./lifecycle.ts";

const repoRoot = join(import.meta.dir, "..", "..");
const temps: string[] = [];

afterEach(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
  temps.length = 0;
});

function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  temps.push(d);
  return d;
}

test("prepare attaches vendor skills onto a separate desk", () => {
  const home = tmp("shelf-home-");
  const desk = tmp("notes-desk-");
  const run = prepare({
    repoRoot,
    home,
    host: "codex",
    attachRoot: desk,
    scope: "project",
  });
  expect(run.kind).toBe("installed");
  if (run.kind !== "installed") return;
  expect(existsSync(join(desk, ".agents/skills/poteto-mode/SKILL.md"))).toBe(true);
  expect(existsSync(join(desk, ".codex/pstack-host.md"))).toBe(true);
  expect(existsSync(join(repoRoot, ".agents/skills/poteto-mode/SKILL.md"))).toBe(false);
  const seen = observe({ home, host: "codex", attachRoot: desk, scope: "project" });
  expect(seen.kind).toBe("observed");
  if (seen.kind !== "observed") return;
  expect(seen.cardExists).toBe(true);
  const gone = clean({ repoRoot, home, host: "codex", attachRoot: desk, scope: "project" });
  expect(gone.kind).toBe("cleaned");
  expect(existsSync(join(desk, ".agents/skills/poteto-mode/SKILL.md"))).toBe(false);
});

const miniAttach = [
  {
    host: "grok" as const,
    skill: ".grok/skills/poteto-mode/SKILL.md",
    card: ".grok/pstack-host.md",
    stub: "read .grok/pstack-host.md",
  },
  {
    host: "pi" as const,
    skill: ".pi/skills/poteto-mode/SKILL.md",
    card: ".pi/pstack-host.md",
    stub: "read .pi/pstack-host.md",
  },
  {
    host: "omp" as const,
    skill: ".omp/skills/poteto-mode/SKILL.md",
    card: ".omp/pstack-host.md",
    stub: "read .omp/pstack-host.md",
  },
];

for (const row of miniAttach) {
  test(`prepare attaches ${row.host} onto a separate desk`, () => {
    const home = tmp("shelf-home-");
    const desk = tmp("notes-desk-");
    const run = prepare({
      repoRoot,
      home,
      host: row.host,
      attachRoot: desk,
      scope: "project",
    });
    expect(run.kind).toBe("installed");
    if (run.kind !== "installed") return;
    expect(existsSync(join(desk, row.skill))).toBe(true);
    expect(existsSync(join(desk, row.card))).toBe(true);
    expect(existsSync(join(desk, "AGENTS.md"))).toBe(true);
    expect(readFileSync(join(desk, "AGENTS.md"), "utf8")).toContain(row.stub);
    expect(existsSync(join(repoRoot, row.skill))).toBe(false);
    const seen = observe({ home, host: row.host, attachRoot: desk, scope: "project" });
    expect(seen.kind).toBe("observed");
    if (seen.kind !== "observed") return;
    expect(seen.cardExists).toBe(true);
    const gone = clean({ repoRoot, home, host: row.host, attachRoot: desk, scope: "project" });
    expect(gone.kind).toBe("cleaned");
    expect(existsSync(join(desk, row.skill))).toBe(false);
  });
}

test("observe without prepare is skipped", () => {
  const home = tmp("shelf-home-");
  const desk = tmp("notes-desk-");
  mkdirSync(desk, { recursive: true });
  const seen = observe({ home, host: "claude-code", attachRoot: desk, scope: "project" });
  expect(seen.kind).toBe("skipped");
});
