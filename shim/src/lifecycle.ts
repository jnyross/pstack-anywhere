import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { install, receiptPath, uninstall, type Receipt } from "./apply.ts";
import { type HostId, type HostProfile, type Scope } from "./capability.ts";
import { hostById } from "./hosts.ts";
import { expand } from "./paths.ts";

export type MiniBin =
  | { kind: "found"; name: string; path: string }
  | { kind: "missing"; name: string }
  | { kind: "unauth"; name: string; path: string; detail: string };

export type HostRun =
  | { kind: "skipped"; host: string; reason: string }
  | {
      kind: "ready";
      host: HostId;
      profile: HostProfile;
      bin: MiniBin;
    }
  | {
      kind: "installed";
      host: HostId;
      home: string;
      attachRoot: string;
      scope: Scope;
      receipt: string;
      card: string;
      writes: string[];
    }
  | {
      kind: "observed";
      host: HostId;
      receipt: Receipt;
      cardExists: boolean;
      doctorLine: string;
    }
  | { kind: "cleaned"; host: HostId; removed: string[] };

export type Scenario = {
  slug: string;
  host: HostId;
  prompt: string;
};

export const scenarios: readonly Scenario[] = [
  {
    slug: "codex-notes",
    host: "codex",
    prompt:
      "Add a one-line checklist to NOTES.md listing the files you will touch before you edit anything else. Keep the change tiny.",
  },
  {
    slug: "claude-notes",
    host: "claude-code",
    prompt:
      "Add a one-line checklist to NOTES.md listing the files you will touch before you edit anything else. Keep the change tiny.",
  },
  {
    slug: "cursor-notes",
    host: "cursor",
    prompt:
      "Add a one-line checklist to NOTES.md listing the files you will touch before you edit anything else. Keep the change tiny.",
  },
];

export function prepare(opts: {
  repoRoot: string;
  home: string;
  host: HostId;
  attachRoot: string;
  scope: Scope;
}): HostRun {
  mkdirSync(opts.attachRoot, { recursive: true });
  const profile = hostById(opts.host);
  const { writes, receipt } = install({
    repoRoot: opts.repoRoot,
    home: opts.home,
    host: profile,
    scope: opts.scope,
    dryRun: false,
    attachRoot: opts.attachRoot,
  });
  const cardTpl = opts.scope === "user" ? profile.userCard : profile.projectCard;
  const card = expand(cardTpl, opts.home, opts.attachRoot);
  const rec = receiptPath(opts.home, profile.id, opts.scope, opts.attachRoot);
  return {
    kind: "installed",
    host: opts.host,
    home: opts.home,
    attachRoot: opts.attachRoot,
    scope: opts.scope,
    receipt: rec,
    card,
    writes,
  };
}

export function observe(opts: {
  home: string;
  host: HostId;
  attachRoot: string;
  scope: Scope;
}): HostRun {
  const profile = hostById(opts.host);
  const recFile = receiptPath(opts.home, profile.id, opts.scope, opts.attachRoot);
  if (!existsSync(recFile)) {
    return { kind: "skipped", host: opts.host, reason: `no receipt at ${recFile}` };
  }
  const receipt = JSON.parse(readFileSync(recFile, "utf8")) as Receipt;
  const cardTpl = opts.scope === "user" ? profile.userCard : profile.projectCard;
  const card = expand(cardTpl, opts.home, opts.attachRoot);
  const native = Object.values(profile.capabilities).filter((b) => b.kind === "native").length;
  const reduced = Object.values(profile.capabilities).filter((b) => b.kind !== "native").length;
  return {
    kind: "observed",
    host: opts.host,
    receipt,
    cardExists: existsSync(card),
    doctorLine: `${profile.displayName}: ${native} native, ${reduced} reduced`,
  };
}

export function clean(opts: {
  repoRoot: string;
  home: string;
  host: HostId;
  attachRoot: string;
  scope: Scope;
}): HostRun {
  const profile = hostById(opts.host);
  const removed = uninstall({
    home: opts.home,
    host: profile,
    scope: opts.scope,
    dryRun: false,
    repoRoot: opts.attachRoot,
  });
  return { kind: "cleaned", host: opts.host, removed };
}

export function deskPath(root: string, slug: string): string {
  return join(root, slug);
}
