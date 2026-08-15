#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GOLD_HOSTS, type GoldGrade } from "./gold.ts";

const evidenceRoot = process.argv[2];
if (!evidenceRoot) {
  console.error("usage: compare-gold.ts <evidence-root>");
  process.exit(2);
}

function readGrade(host: string): GoldGrade | null {
  const p = join(evidenceRoot, host, "grade.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as GoldGrade;
}

const gold = readGrade("codex");
const hosts: Record<string, { kind: string | "missing" }> = {};
for (const host of GOLD_HOSTS) {
  const g = readGrade(host);
  hosts[host] = { kind: g?.kind ?? "missing" };
}

const allPassed = GOLD_HOSTS.every((h) => hosts[h].kind === "passed_gold_task");
const summary = {
  goldHost: "codex",
  goldKind: gold?.kind ?? "missing",
  hosts,
  passed: allPassed && gold?.kind === "passed_gold_task",
};
writeFileSync(join(evidenceRoot, "compare.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.passed ? 0 : 1);
