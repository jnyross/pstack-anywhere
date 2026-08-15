import { expect, test } from "bun:test";
import { join } from "node:path";
import { hostById, hosts, validateProfile } from "./hosts.ts";

const repoRoot = join(import.meta.dir, "..", "..");

test("shipped hosts have valid catalog ids and affects paths", () => {
  for (const host of hosts) {
    expect(validateProfile({ host, repoRoot })).toEqual([]);
  }
});

test("unknown catalog id is an error", () => {
  const host = structuredClone(hostById("cursor"));
  host.capabilities["external.teamKit"] = {
    kind: "absent",
    instead: "skip",
    affects: ["skills/poteto-mode/SKILL.md"],
    catalog: "not-a-real-degrade",
  };
  expect(validateProfile({ host, repoRoot })).toEqual([
    { kind: "unknown-catalog", capability: "external.teamKit", catalog: "not-a-real-degrade" },
  ]);
});

test("missing affects path is an error", () => {
  const host = structuredClone(hostById("cursor"));
  host.capabilities["external.teamKit"] = {
    kind: "absent",
    instead: "skip",
    affects: ["skills/does-not-exist/SKILL.md"],
    catalog: "skip-team-kit",
  };
  expect(validateProfile({ host, repoRoot })).toEqual([
    { kind: "unknown-affects", capability: "external.teamKit", path: "skills/does-not-exist/SKILL.md" },
  ]);
});
