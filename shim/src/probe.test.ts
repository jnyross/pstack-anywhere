import { expect, test } from "bun:test";
import { claudeRow, droidRow, ompRow, piRow } from "./probe.ts";

const maxAuth = `{
  "loggedIn": true,
  "subscriptionType": "max"
}`;

test("claude auth max is still unauth when print CLI is org-disabled", () => {
  const row = claudeRow(
    "/bin/claude",
    maxAuth,
    "Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead",
  );
  expect(row.kind).toBe("unauth");
  if (row.kind !== "unauth") return;
  expect(row.detail).toMatch(/disabled Claude subscription/i);
});

test("claude found only when logged in and print is not org-disabled", () => {
  const row = claudeRow("/bin/claude", maxAuth, "ok");
  expect(row).toEqual({ kind: "found", name: "claude", path: "/bin/claude" });
});

test("droid without FACTORY_API_KEY is unauth", () => {
  const row = droidRow("/bin/droid", undefined);
  expect(row.kind).toBe("unauth");
  if (row.kind !== "unauth") return;
  expect(row.detail).toBe("FACTORY_API_KEY is unset");
});

test("droid with FACTORY_API_KEY is found", () => {
  expect(droidRow("/bin/droid", "fk-test")).toEqual({
    kind: "found",
    name: "droid",
    path: "/bin/droid",
  });
});

test("pi list-models table is found", () => {
  const out = `provider  model              context  max-out  thinking  images
zai       glm-5.2            1M       131.1K   yes       no`;
  expect(piRow("/bin/pi", out)).toEqual({ kind: "found", name: "pi", path: "/bin/pi" });
});

test("pi without models is unauth", () => {
  const row = piRow("/bin/pi", "Error: not authenticated");
  expect(row.kind).toBe("unauth");
  if (row.kind !== "unauth") return;
  expect(row.detail).toMatch(/not authenticated/i);
});

test("omp without config is unauth", () => {
  const row = ompRow("/bin/omp", undefined);
  expect(row.kind).toBe("unauth");
  if (row.kind !== "unauth") return;
  expect(row.detail).toBe("missing ~/.omp/agent/config.yml");
});

test("omp with config is found", () => {
  expect(ompRow("/bin/omp", "/tmp/omp/config.yml")).toEqual({
    kind: "found",
    name: "omp",
    path: "/bin/omp",
  });
});
