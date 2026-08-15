import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { MiniBin } from "./lifecycle.ts";

function which(name: string): string | null {
  const r = spawnSync("which", [name], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const p = r.stdout.trim();
  return p.length > 0 ? p : null;
}

function run(cmd: string, args: string[]): { status: number; out: string } {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 20_000 });
  return { status: r.status ?? 1, out: `${r.stdout}\n${r.stderr}`.trim() };
}

export function probeMini(): MiniBin[] {
  const rows: MiniBin[] = [];

  const codex = which("codex");
  if (!codex) rows.push({ kind: "missing", name: "codex" });
  else {
    const auth = run(codex, ["login", "status"]);
    if (/logged in/i.test(auth.out)) rows.push({ kind: "found", name: "codex", path: codex });
    else rows.push({ kind: "unauth", name: "codex", path: codex, detail: auth.out.slice(0, 200) });
  }

  const grok = which("grok");
  if (!grok) rows.push({ kind: "missing", name: "grok" });
  else {
    const auth = run(grok, ["models"]);
    if (/not authenticated/i.test(auth.out)) {
      rows.push({ kind: "unauth", name: "grok", path: grok, detail: "grok models: You are not authenticated." });
    } else rows.push({ kind: "found", name: "grok", path: grok });
  }

  const droid = which("droid");
  if (!droid) rows.push({ kind: "missing", name: "droid" });
  else rows.push({ kind: "found", name: "droid", path: droid });

  const claude = which("claude");
  if (!claude) rows.push({ kind: "missing", name: "claude" });
  else {
    const auth = run(claude, ["auth", "status"]);
    const loggedIn = /"loggedIn": true/.test(auth.out);
    const disabled = /disabled Claude subscription/i.test(auth.out);
    if (loggedIn && !disabled) {
      rows.push({ kind: "found", name: "claude", path: claude });
    } else {
      rows.push({
        kind: "unauth",
        name: "claude",
        path: claude,
        detail: auth.out.slice(0, 240) || "claude auth status failed",
      });
    }
  }

  const cursorAgent = which("cursor-agent");
  if (!cursorAgent) rows.push({ kind: "missing", name: "cursor-agent" });
  else rows.push({ kind: "found", name: "cursor-agent", path: cursorAgent });

  if (!existsSync(`${process.env.HOME}/.cursor/plugins/cache`)) {
    rows.push({ kind: "missing", name: "cursor-plugin-cache" });
  } else {
    rows.push({
      kind: "found",
      name: "cursor-plugin-cache",
      path: `${process.env.HOME}/.cursor/plugins/cache`,
    });
  }

  return rows;
}
