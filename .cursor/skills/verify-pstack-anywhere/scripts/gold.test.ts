import { expect, test } from "bun:test";
import { classifyGold, greetMatchesGold, layoutFor } from "./gold.ts";

test("codex layout points at agents skills", () => {
  expect(layoutFor("codex").skill).toBe(".agents/skills/poteto-mode/SKILL.md");
});

test("grok layout points at grok skills", () => {
  expect(layoutFor("grok").card).toBe(".grok/pstack-host.md");
});

test("Hello Ada with optional period is gold", () => {
  expect(greetMatchesGold("Hello, Ada")).toBe(true);
  expect(greetMatchesGold("Hello, Ada.")).toBe(true);
  expect(greetMatchesGold("Hi, Ada")).toBe(false);
});

test("missing greet and empty log is failed_to_start", () => {
  expect(
    classifyGold({ greetAda: null, bunTestExit: null, logBytes: 0, greetFile: false }),
  ).toBe("failed_to_start");
});

test("wrong greet is failed_gold_task", () => {
  expect(
    classifyGold({ greetAda: "hey", bunTestExit: 0, logBytes: 12, greetFile: true }),
  ).toBe("failed_gold_task");
});

test("matching greet and bun test is passed_gold_task", () => {
  expect(
    classifyGold({
      greetAda: "Hello, Ada",
      bunTestExit: 0,
      logBytes: 80,
      greetFile: true,
    }),
  ).toBe("passed_gold_task");
});
