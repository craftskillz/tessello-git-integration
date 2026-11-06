// The contract with the `tessello sync` engine: the config this Module writes, the status it reads, and the rules
// that turn them into what the View shows. Pure: no DOM, no SDK at runtime.

import type { Json } from "@tessello/sdk";
import { t } from "./i18n.ts";

export const MODULE_ID = "@craftskillz/git-integration";

export interface SyncConfig {
  remote: string;
  push: boolean;
  intervalSeconds: number;
  dataModules: string[];
}


const PROBLEM_KINDS = ["push-rejected", "auth", "remote-unreachable", "git-missing", "not-a-modules-folder", "no-config"] as const;

export type ProblemKind = (typeof PROBLEM_KINDS)[number];

export interface SyncStatus {
  heartbeat: string;
  installed: { id: string; name: string; folder: string }[];
  ownRepositories: string[];
  lastCommit?: { sha: string; at: string; modules: string[] };
  lastPush?: { at: string };
  remoteVisibility?: "public" | "private" | "unknown";
  problem?: { kind: ProblemKind; message: string; since: string };
}

export const DEFAULT_CONFIG: SyncConfig = { remote: "", push: true, intervalSeconds: 60, dataModules: [] };

const MIN_INTERVAL = 10;
const MAX_INTERVAL = 3600;

function isObject(value: Json | undefined | null): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: Json | undefined): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** The config from storage; every missing or invalid field falls back to its default. */
export function readConfig(value: Json | null): SyncConfig {
  const raw = isObject(value) ? value : {};
  const interval = raw.intervalSeconds;
  return {
    remote: typeof raw.remote === "string" ? raw.remote : DEFAULT_CONFIG.remote,
    push: typeof raw.push === "boolean" ? raw.push : DEFAULT_CONFIG.push,
    intervalSeconds:
      typeof interval === "number" && Number.isFinite(interval)
        ? Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.round(interval)))
        : DEFAULT_CONFIG.intervalSeconds,
    dataModules: isStringArray(raw.dataModules) ? [...raw.dataModules] : [],
  };
}

/** A whole number of seconds from 10 to 3600, or null. */
export function parseInterval(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const seconds = Number(trimmed);
  return seconds >= MIN_INTERVAL && seconds <= MAX_INTERVAL ? seconds : null;
}


/** The status from storage, or null when it is not one; malformed optional parts are dropped. */
export function readStatus(value: Json | null): SyncStatus | null {
  if (!isObject(value) || typeof value.heartbeat !== "string") return null;
  const status: SyncStatus = { heartbeat: value.heartbeat, installed: [], ownRepositories: [] };
  if (Array.isArray(value.installed)) {
    for (const entry of value.installed) {
      if (isObject(entry) && typeof entry.id === "string" && typeof entry.name === "string" && typeof entry.folder === "string") {
        status.installed.push({ id: entry.id, name: entry.name, folder: entry.folder });
      }
    }
  }
  if (isStringArray(value.ownRepositories)) status.ownRepositories = [...value.ownRepositories];
  const commit = value.lastCommit;
  if (isObject(commit) && typeof commit.sha === "string" && typeof commit.at === "string" && isStringArray(commit.modules)) {
    status.lastCommit = { sha: commit.sha, at: commit.at, modules: [...commit.modules] };
  }
  if (isObject(value.lastPush) && typeof value.lastPush.at === "string") status.lastPush = { at: value.lastPush.at };
  const visibility = value.remoteVisibility;
  if (visibility === "public" || visibility === "private" || visibility === "unknown") status.remoteVisibility = visibility;
  const problem = value.problem;
  if (
    isObject(problem) &&
    typeof problem.kind === "string" &&
    (PROBLEM_KINDS as readonly string[]).includes(problem.kind) &&
    typeof problem.message === "string" &&
    typeof problem.since === "string"
  ) {
    status.problem = { kind: problem.kind as ProblemKind, message: problem.message, since: problem.since };
  }
  return status;
}

/** Whether the engine wrote its heartbeat within 2 x the interval + 10 s (60 s interval without a config). */
export function isEngineRunning(status: SyncStatus | null, config: SyncConfig | null, now: number): boolean {
  if (!status) return false;
  const beat = Date.parse(status.heartbeat);
  if (Number.isNaN(beat)) return false;
  const interval = config ? config.intervalSeconds : DEFAULT_CONFIG.intervalSeconds;
  return now - beat <= (2 * interval + 10) * 1000;
}

/** A date as "3 hours ago" in the current language; the future and unreadable dates read as "just now". */
export function relativeTime(at: string, now: number): string {
  const time = Date.parse(at);
  const minutes = Number.isNaN(time) ? 0 : Math.floor((now - time) / 60_000);
  if (minutes < 1) return t("time_now");
  if (minutes < 60) return minutes === 1 ? t("time_minutes_one") : t("time_minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? t("time_hours_one") : t("time_hours", { count: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t("time_days_one") : t("time_days", { count: days });
}

/** The ids of the "seen" Modules, or null when there are none yet (first visit). */
export function readSeen(value: Json | null): string[] | null {
  return isStringArray(value ?? undefined) ? [...(value as string[])] : null;
}

/** The installed Modules to list: sorted by name, this Module left out; new ones are those missing from `seen`. */
export function listedModules(
  status: SyncStatus | null,
  config: SyncConfig,
  seen: string[] | null,
): { id: string; name: string; versioned: boolean; isNew: boolean }[] {
  if (!status) return [];
  return status.installed
    .filter((module) => module.id !== MODULE_ID)
    .map((module) => ({
      id: module.id,
      name: module.name,
      versioned: config.dataModules.includes(module.id),
      isNew: seen !== null && !seen.includes(module.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A new config with the Module added to or removed from the versioned data, sorted and without duplicates. */
export function withDataModule(config: SyncConfig, id: string, versioned: boolean): SyncConfig {
  const others = config.dataModules.filter((existing) => existing !== id);
  return { ...config, dataModules: (versioned ? [...others, id] : others).sort() };
}
