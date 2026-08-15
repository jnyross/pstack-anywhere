#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { classifyGold, type GoldGrade } from "./gold.ts";

const evidence = process.argv[2];
const desk = process.argv[3];
const host = process.argv[4] ?? "unknown";
if (!evidence || !desk) {
  console.error("usage: grade-gold.ts <evidence-dir> <desk> <host>");
  process.exit(2);
}

function findLog(dir: string): string {
  const names = ["host.log", "codex.log", `${host}.log`];
  for (const n of names) {
    const p = join(dir, n);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  return "";
}

function findTestFile(root: string): string | null {
  const skip = new Set([".git", ".shelf-home", "node_modules", ".agents", ".grok", ".pi", ".omp", ".codex"]);
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: ReturnType<typeof readdirSync> = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const p = join(dir, entry.name);
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.js")) return p;
      if (entry.isDirectory()) stack.push(p);
    }
  }
  return null;
}

const greetPath = join(desk, "src/greet.ts");
const greetFile = existsSync(greetPath);
const log = findLog(evidence);
let greetAda: string | null = null;
if (greetFile) {
  const probe = spawnSync(
    "bun",
    [
      "-e",
      `import { greet } from ${JSON.stringify(greetPath)}; process.stdout.write(String(greet("Ada")));`,
    ],
    { encoding: "utf8", timeout: 20_000, cwd: desk },
  );
  if (probe.status === 0) greetAda = probe.stdout;
}

let bunTestExit: number | null = null;
const testFile = findTestFile(desk) ?? (greetFile ? greetPath : null);
if (testFile) {
  const r = spawnSync("bun", ["test", testFile], {
    encoding: "utf8",
    timeout: 30_000,
    cwd: desk,
  });
  bunTestExit = r.status ?? 1;
}

const kind = classifyGold({
  greetAda,
  bunTestExit,
  logBytes: log.length,
  greetFile,
});
const grade: GoldGrade = {
  host,
  kind,
  greet: greetFile,
  greetAda,
  bunTestExit,
  logBytes: log.length,
};
writeFileSync(join(evidence, "grade.json"), `${JSON.stringify(grade, null, 2)}\n`);
if (greetFile) {
  writeFileSync(join(evidence, "greet.ts"), readFileSync(greetPath));
}
console.log(JSON.stringify(grade));
process.exit(kind === "passed_gold_task" ? 0 : 1);
