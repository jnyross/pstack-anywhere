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

export function claudeRow(path: string, authOut: string, printOut: string): MiniBin {
  const loggedIn = /"loggedIn": true/.test(authOut);
  const printDisabled = /disabled Claude subscription/i.test(printOut);
  if (loggedIn && !printDisabled) {
    return { kind: "found", name: "claude", path };
  }
  const detail = printDisabled
    ? printOut.slice(0, 240)
    : authOut.slice(0, 240) || "claude auth status failed";
  return { kind: "unauth", name: "claude", path, detail };
}

export function droidRow(path: string, factoryKey: string | undefined): MiniBin {
  if (!factoryKey) {
    return {
      kind: "unauth",
      name: "droid",
      path,
      detail: "FACTORY_API_KEY is unset",
    };
  }
  return { kind: "found", name: "droid", path };
}

export function piRow(path: string, listOut: string): MiniBin {
  if (/provider\s+model/i.test(listOut) || /^\s*\S+\s+\S+\s+\d/m.test(listOut)) {
    return { kind: "found", name: "pi", path };
  }
  return {
    kind: "unauth",
    name: "pi",
    path,
    detail: listOut.slice(0, 240) || "pi --list-models produced no models",
  };
}

export function ompRow(path: string, configPath: string | undefined): MiniBin {
  if (!configPath) {
    return {
      kind: "unauth",
      name: "omp",
      path,
      detail: "missing ~/.omp/agent/config.yml",
    };
  }
  return { kind: "found", name: "omp", path };
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

  const pi = which("pi");
  if (!pi) rows.push({ kind: "missing", name: "pi" });
  else rows.push(piRow(pi, run(pi, ["--list-models"]).out));

  const omp = which("omp");
  if (!omp) rows.push({ kind: "missing", name: "omp" });
  else {
    const ompConfig = process.env.HOME ? `${process.env.HOME}/.omp/agent/config.yml` : "";
    rows.push(ompRow(omp, existsSync(ompConfig) ? ompConfig : undefined));
  }

  const droid = which("droid");
  if (!droid) rows.push({ kind: "missing", name: "droid" });
  else rows.push(droidRow(droid, process.env.FACTORY_API_KEY));

  const claude = which("claude");
  if (!claude) rows.push({ kind: "missing", name: "claude" });
  else {
    const auth = run(claude, ["auth", "status"]);
    let printOut = "";
    if (/"loggedIn": true/.test(auth.out)) {
      printOut = run(claude, ["-p", "--max-turns", "0", "--model", "haiku", "ok"]).out;
    }
    rows.push(claudeRow(claude, auth.out, printOut));
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
