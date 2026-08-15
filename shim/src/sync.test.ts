import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyFetchedPstack } from "./sync.ts";
import { handEdits, listVendorFiles, writeLock } from "./vendor.ts";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "pstack-sync-fix-"));
  mkdirSync(join(root, "skills/demo"), { recursive: true });
  mkdirSync(join(root, "agents"), { recursive: true });
  writeFileSync(join(root, "skills/demo/SKILL.md"), "skill-a\n");
  writeFileSync(join(root, "agents/poteto-agent.md"), "agent-a\n");
  writeLock(root, {
    source: "https://github.com/cursor/plugins",
    subdir: "pstack",
    commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    version: "0.1.0",
    files: listVendorFiles(root),
  });
  return root;
}

test("sync refuses when a vendor file was hand-edited", () => {
  const root = fixture();
  try {
    writeFileSync(join(root, "skills/demo/SKILL.md"), "edited\n");
    const drifts = handEdits(root);
    expect(drifts.some((d) => d.path === "skills/demo/SKILL.md" && d.reason === "changed")).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyFetchedPstack rewrites the lock and vendor trees", () => {
  const root = fixture();
  const fetched = mkdtempSync(join(tmpdir(), "pstack-fetched-"));
  try {
    mkdirSync(join(fetched, "skills/demo"), { recursive: true });
    mkdirSync(join(fetched, "agents"), { recursive: true });
    mkdirSync(join(fetched, ".cursor-plugin"), { recursive: true });
    writeFileSync(join(fetched, "skills/demo/SKILL.md"), "skill-b\n");
    writeFileSync(join(fetched, "agents/poteto-agent.md"), "agent-b\n");
    writeFileSync(join(fetched, ".cursor-plugin/plugin.json"), '{"version":"0.2.0"}\n');
    const result = applyFetchedPstack({
      repoRoot: root,
      pstackRoot: fetched,
      commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      dryRun: false,
    });
    expect(result.kind).toBe("applied");
    expect(result.after.version).toBe("0.2.0");
    expect(result.after.commit).toBe("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(readFileSync(join(root, "skills/demo/SKILL.md"), "utf8")).toBe("skill-b\n");
    expect(handEdits(root)).toEqual([]);
    expect(result.changed).toContain("skills/demo/SKILL.md");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(fetched, { recursive: true, force: true });
  }
});

test("applyFetchedPstack dry-run leaves the tree untouched", () => {
  const root = fixture();
  const fetched = mkdtempSync(join(tmpdir(), "pstack-fetched-"));
  try {
    mkdirSync(join(fetched, "skills/demo"), { recursive: true });
    mkdirSync(join(fetched, "agents"), { recursive: true });
    writeFileSync(join(fetched, "skills/demo/SKILL.md"), "skill-b\n");
    writeFileSync(join(fetched, "agents/poteto-agent.md"), "agent-b\n");
    const before = readFileSync(join(root, "skills/demo/SKILL.md"), "utf8");
    const result = applyFetchedPstack({
      repoRoot: root,
      pstackRoot: fetched,
      commit: "cccccccccccccccccccccccccccccccccccccccc",
      dryRun: true,
    });
    expect(result.kind).toBe("planned");
    expect(readFileSync(join(root, "skills/demo/SKILL.md"), "utf8")).toBe(before);
    expect(JSON.parse(readFileSync(join(root, ".upstream.json"), "utf8")).commit).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(fetched, { recursive: true, force: true });
  }
});
