import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { install, receiptPath, uninstall } from "./apply.ts";
import { capabilityTiers, type Scope } from "./capability.ts";
import { cursorPluginJson } from "./card.ts";
import { hostById, hosts, validateProfile } from "./hosts.ts";
import { defaultHome } from "./paths.ts";
import { syncVendor } from "./sync.ts";
import { vendorDrift } from "./vendor.ts";

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function usage(): string {
  return `pstack-anywhere <command>

  check
  install --host <cursor|claude-code|codex|gemini> [--scope user|project] [--dry-run]
  uninstall --host <id> [--scope user|project] [--dry-run]
  sync [--ref <git-ref>] [--dry-run]
  doctor --host <id>
  status
  emit-plugin
`;
}

function parseScope(raw: string | undefined): Scope {
  if (raw === "user" || raw === "project") return raw;
  throw new Error(`unknown scope: ${raw ?? ""}`);
}

function arg(args: string[], name: string, fallback?: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1];
}

function has(args: string[], name: string): boolean {
  return args.includes(name);
}

function cmdCheck(root: string): number {
  const drifts = vendorDrift(root);
  const profileErrors = hosts.flatMap((host) => validateProfile({ host, repoRoot: root }));
  if (drifts.length === 0 && profileErrors.length === 0) {
    console.log("upstream lock ok");
    return 0;
  }
  for (const d of drifts) console.error(`${d.reason}\t${d.path}`);
  for (const e of profileErrors) {
    if (e.kind === "unknown-catalog") console.error(`${e.kind}\t${e.capability}\t${e.catalog}`);
    else console.error(`${e.kind}\t${e.capability}\t${e.path}`);
  }
  return 1;
}

function cmdInstall(root: string, args: string[]): number {
  const host = hostById(arg(args, "--host") ?? "");
  const scope = parseScope(arg(args, "--scope", "user"));
  const dryRun = has(args, "--dry-run");
  const home = process.env.PSTACK_HOME ?? defaultHome();
  const { writes } = install({ repoRoot: root, home, host, scope, dryRun });
  console.log(`${dryRun ? "would write" : "wrote"} ${writes.length} paths for ${host.id}/${scope}`);
  for (const w of writes) console.log(w);
  return 0;
}

function cmdUninstall(root: string, args: string[]): number {
  const host = hostById(arg(args, "--host") ?? "");
  const scope = parseScope(arg(args, "--scope", "user"));
  const dryRun = has(args, "--dry-run");
  const home = process.env.PSTACK_HOME ?? defaultHome();
  const removed = uninstall({ home, host, scope, dryRun });
  console.log(`${dryRun ? "would remove" : "removed"} ${removed.length} paths`);
  return 0;
}

function cmdSync(root: string, args: string[]): number {
  const result = syncVendor({
    repoRoot: root,
    ref: arg(args, "--ref") ?? "main",
    dryRun: has(args, "--dry-run"),
  });
  if (result.kind === "refused") {
    console.error("sync refused: vendor files were hand-edited");
    for (const d of result.drifts) console.error(`${d.reason}\t${d.path}`);
    return 1;
  }
  const verb = result.kind === "planned" ? "would sync" : "synced";
  console.log(`${verb} ${result.before.commit.slice(0, 12)} -> ${result.after.commit.slice(0, 12)}`);
  console.log(`version ${result.before.version} -> ${result.after.version}`);
  console.log(`changed ${result.changed.length} files`);
  for (const path of result.changed) console.log(path);
  return 0;
}

function cmdDoctor(args: string[]): number {
  const host = hostById(arg(args, "--host") ?? "");
  const counts = { core: { native: 0, other: 0 }, full_rigor: { native: 0, other: 0 }, luxury: { native: 0, other: 0 } };
  for (const [id, binding] of Object.entries(host.capabilities)) {
    const tier = capabilityTiers[id as keyof typeof capabilityTiers];
    if (binding.kind === "native") counts[tier].native++;
    else counts[tier].other++;
  }
  console.log(`${host.displayName}`);
  for (const tier of ["core", "full_rigor", "luxury"] as const) {
    console.log(`${tier}: ${counts[tier].native} native, ${counts[tier].other} reduced`);
  }
  for (const [id, binding] of Object.entries(host.capabilities)) {
    console.log(`${id}\t${binding.kind}`);
  }
  return 0;
}

function cmdStatus(): number {
  const home = process.env.PSTACK_HOME ?? defaultHome();
  for (const host of hosts) {
    for (const scope of ["user", "project"] as const) {
      const p = receiptPath(home, host.id, scope);
      if (existsSync(p)) console.log(`installed\t${host.id}\t${scope}\t${p}`);
    }
  }
  return 0;
}

function main(argv: string[]): number {
  const root = repoRoot();
  const [cmd, ...args] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help") {
    console.log(usage());
    return 0;
  }
  if (cmd === "check") return cmdCheck(root);
  if (cmd === "install") return cmdInstall(root, args);
  if (cmd === "uninstall") return cmdUninstall(root, args);
  if (cmd === "sync") return cmdSync(root, args);
  if (cmd === "doctor") return cmdDoctor(args);
  if (cmd === "status") return cmdStatus();
  if (cmd === "emit-plugin") {
    process.stdout.write(cursorPluginJson());
    return 0;
  }
  console.error(usage());
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));

export { main };
