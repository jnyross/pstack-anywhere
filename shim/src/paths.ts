import { homedir } from "node:os";
import { resolve } from "node:path";

export function expand(template: string, home: string, repo: string): string {
  return template
    .replaceAll("{home}", home)
    .replaceAll("~", home)
    .replaceAll("{repo}", repo);
}

export function abs(path: string): string {
  return resolve(path);
}

export function defaultHome(): string {
  return homedir();
}
