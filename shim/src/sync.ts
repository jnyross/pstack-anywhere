import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  handEdits,
  listVendorFiles,
  loadLock,
  writeLock,
  type Drift,
  type LockFile,
} from "./vendor.ts";

export type SyncResult =
  | { readonly kind: "refused"; readonly drifts: readonly Drift[] }
  | {
      readonly kind: "planned" | "applied";
      readonly before: LockFile;
      readonly after: LockFile;
      readonly changed: readonly string[];
    };

function run(cmd: string[], cwd?: string): string {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `${cmd.join(" ")} exited ${result.status}`);
  }
  return result.stdout.trim();
}

function readVersion(pstackRoot: string, fallback: string): string {
  const plugin = join(pstackRoot, ".cursor-plugin", "plugin.json");
  if (!existsSync(plugin)) return fallback;
  const raw: unknown = JSON.parse(readFileSync(plugin, "utf8"));
  if (typeof raw !== "object" || raw === null || !("version" in raw)) return fallback;
  return typeof raw.version === "string" ? raw.version : fallback;
}

function changedPaths(before: LockFile, after: LockFile): string[] {
  const prev = new Map(before.files.map((f) => [f.path, f.sha256]));
  const next = new Map(after.files.map((f) => [f.path, f.sha256]));
  const paths = new Set([...prev.keys(), ...next.keys()]);
  return [...paths].filter((path) => prev.get(path) !== next.get(path)).sort();
}

export function fetchPstack(opts: { ref: string; dest: string }): { commit: string } {
  run(["git", "init", opts.dest]);
  run(["git", "remote", "add", "origin", "https://github.com/cursor/plugins.git"], opts.dest);
  run(["git", "sparse-checkout", "init", "--cone"], opts.dest);
  run(["git", "sparse-checkout", "set", "pstack/skills", "pstack/agents", "pstack/.cursor-plugin"], opts.dest);
  run(["git", "fetch", "--depth", "1", "origin", opts.ref], opts.dest);
  run(["git", "checkout", "FETCH_HEAD"], opts.dest);
  return { commit: run(["git", "rev-parse", "HEAD"], opts.dest) };
}

export function applyFetchedPstack(opts: {
  repoRoot: string;
  pstackRoot: string;
  commit: string;
  dryRun: boolean;
}): Extract<SyncResult, { kind: "planned" | "applied" }> {
  const before = loadLock(opts.repoRoot);
  const after: LockFile = {
    source: before.source,
    subdir: before.subdir,
    commit: opts.commit,
    version: readVersion(opts.pstackRoot, before.version),
    files: listVendorFiles(opts.pstackRoot),
  };
  if (!opts.dryRun) {
    for (const tree of ["skills", "agents"] as const) {
      const from = join(opts.pstackRoot, tree);
      const to = join(opts.repoRoot, tree);
      if (!existsSync(from)) throw new Error(`fetched tree missing ${tree}`);
      rmSync(to, { recursive: true, force: true });
      cpSync(from, to, { recursive: true });
    }
    writeLock(opts.repoRoot, after);
  }
  return {
    kind: opts.dryRun ? "planned" : "applied",
    before,
    after,
    changed: changedPaths(before, after),
  };
}

export function syncVendor(opts: { repoRoot: string; ref: string; dryRun: boolean }): SyncResult {
  const drifts = handEdits(opts.repoRoot);
  if (drifts.length > 0) return { kind: "refused", drifts };
  const dest = mkdtempSync(join(tmpdir(), "pstack-sync-"));
  try {
    const { commit } = fetchPstack({ ref: opts.ref, dest });
    return applyFetchedPstack({
      repoRoot: opts.repoRoot,
      pstackRoot: join(dest, "pstack"),
      commit,
      dryRun: opts.dryRun,
    });
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
}
