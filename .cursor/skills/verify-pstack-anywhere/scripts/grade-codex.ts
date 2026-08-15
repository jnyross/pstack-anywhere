#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const evidence = process.argv[2];
const desk = process.argv[3];
if (!evidence || !desk) {
  console.error("usage: grade-codex.ts <evidence-dir> <desk>");
  process.exit(2);
}

const logPath = join(evidence, "codex.log");
const log = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
const greetDesk = existsSync(join(desk, "src/greet.ts"));
const greetEvidence = existsSync(join(evidence, "greet.ts"));
const greet = greetDesk || greetEvidence;

const needles = ["pstack-host.md", "poteto-mode/SKILL.md", "skills/poteto-mode"];
const hits = needles.filter((n) => log.includes(n));
const failedStart =
  /disabled Claude subscription|not authenticated|Workspace Trust Required|FACTORY_API_KEY/i.test(log) &&
  !greet &&
  hits.length === 0;

let kind: "used_installed_instructions" | "did_task_only" | "failed_to_start";
if (failedStart || log.length === 0) kind = "failed_to_start";
else if (hits.length > 0 && greet) kind = "used_installed_instructions";
else kind = "did_task_only";

const grade = {
  kind,
  hits,
  greet,
  logBytes: log.length,
};
writeFileSync(join(evidence, "grade.json"), `${JSON.stringify(grade, null, 2)}\n`);
console.log(JSON.stringify(grade));
process.exit(kind === "used_installed_instructions" ? 0 : 1);
