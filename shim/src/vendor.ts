import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export type LockFile = {
  source: string;
  subdir: string;
  commit: string;
  version: string;
  files: { path: string; sha256: string; bytes: number }[];
};

export type Drift = { path: string; reason: "missing" | "changed" | "extra" };

export function repoRootFromShim(shimDir: string): string {
  return join(shimDir, "..");
}

export function loadLock(repoRoot: string): LockFile {
  return JSON.parse(readFileSync(join(repoRoot, ".upstream.json"), "utf8")) as LockFile;
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

export function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function vendorDrift(repoRoot: string): Drift[] {
  const lock = loadLock(repoRoot);
  const expected = new Map(lock.files.map((f) => [f.path, f]));
  const seen = new Set<string>();
  const drifts: Drift[] = [];
  for (const tree of ["skills", "agents"]) {
    const root = join(repoRoot, tree);
    if (!existsSync(root)) {
      drifts.push({ path: tree, reason: "missing" });
      continue;
    }
    const files: string[] = [];
    walk(root, files);
    for (const abs of files) {
      const rel = relative(repoRoot, abs).replaceAll("\\", "/");
      seen.add(rel);
      const exp = expected.get(rel);
      if (!exp) {
        drifts.push({ path: rel, reason: "extra" });
        continue;
      }
      if (hashFile(abs) !== exp.sha256) drifts.push({ path: rel, reason: "changed" });
    }
  }
  for (const path of expected.keys()) {
    if (!seen.has(path)) drifts.push({ path, reason: "missing" });
  }
  return drifts;
}

export function skillDirs(repoRoot: string): string[] {
  return readdirSync(join(repoRoot, "skills")).filter((name) =>
    existsSync(join(repoRoot, "skills", name, "SKILL.md")),
  );
}

export function listVendorFiles(repoRoot: string): LockFile["files"] {
  const files: LockFile["files"] = [];
  for (const tree of ["skills", "agents"] as const) {
    const root = join(repoRoot, tree);
    if (!existsSync(root)) continue;
    const found: string[] = [];
    walk(root, found);
    for (const abs of found) {
      const rel = relative(repoRoot, abs).replaceAll("\\", "/");
      const buf = readFileSync(abs);
      files.push({ path: rel, sha256: hashFile(abs), bytes: buf.byteLength });
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

export function writeLock(repoRoot: string, lock: LockFile): void {
  writeFileSync(join(repoRoot, ".upstream.json"), `${JSON.stringify(lock, null, 2)}\n`);
}

export function handEdits(repoRoot: string): Drift[] {
  return vendorDrift(repoRoot).filter((d) => d.reason === "changed" || d.reason === "extra");
}
