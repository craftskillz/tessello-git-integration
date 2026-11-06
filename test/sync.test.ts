import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { setLocale } from "../src/lib/i18n.ts";
import {
  DEFAULT_CONFIG,
  isEngineRunning,
  listedModules,
  parseInterval,
  readConfig,
  readSeen,
  readStatus,
  relativeTime,
  restoreCommands,
  restoreFolder,
  unversionedModules,
  widgetState,
  withDataModule,
  MODULE_ID as MODULE,
} from "../src/lib/sync.ts";

describe("readConfig", () => {
  test("falls back to the defaults when there is no config", () => {
    assert.deepEqual(readConfig(null), { remote: "", push: true, intervalSeconds: 60, dataModules: [] });
    assert.deepEqual(readConfig(null), DEFAULT_CONFIG);
  });

  test("keeps a valid config as it is", () => {
    const config = { remote: "git@github.com:me/data.git", push: false, intervalSeconds: 120, dataModules: ["@a/b"] };
    assert.deepEqual(readConfig(config), config);
  });

  test("falls back field by field", () => {
    const read = readConfig({ remote: 3, push: "yes", intervalSeconds: "x", dataModules: ["@a/b", 4] });
    assert.deepEqual(read, { remote: "", push: true, intervalSeconds: 60, dataModules: [] });
    assert.equal(readConfig({ remote: "r", push: false }).remote, "r");
    assert.equal(readConfig([1]).push, true);
  });

  test("brings the interval to an integer between 10 and 3600", () => {
    assert.equal(readConfig({ intervalSeconds: 3 }).intervalSeconds, 10);
    assert.equal(readConfig({ intervalSeconds: 99999 }).intervalSeconds, 3600);
    assert.equal(readConfig({ intervalSeconds: 45.6 }).intervalSeconds, 46);
    assert.equal(readConfig({ intervalSeconds: Number.NaN }).intervalSeconds, 60);
  });
});

describe("parseInterval", () => {
  test("accepts a whole number from 10 to 3600, trimmed", () => {
    assert.equal(parseInterval("10"), 10);
    assert.equal(parseInterval(" 60 "), 60);
    assert.equal(parseInterval("3600"), 3600);
  });

  test("refuses anything else", () => {
    for (const text of ["", "9", "3601", "1.5", "abc", "1e2", "-20", "0x20", "6 0"]) {
      assert.equal(parseInterval(text), null, text);
    }
  });
});

const NOW = Date.parse("2026-11-06T12:00:00Z");
const secondsAgo = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("readStatus", () => {
  test("is null unless it is an object with a string heartbeat", () => {
    assert.equal(readStatus(null), null);
    assert.equal(readStatus("x"), null);
    assert.equal(readStatus([]), null);
    assert.equal(readStatus({ heartbeat: 3 }), null);
  });

  test("reads a complete status", () => {
    const status = {
      heartbeat: "2026-11-06T12:00:00Z",
      installed: [{ id: "@a/notes", name: "Notes", folder: "notes" }],
      ownRepositories: ["@a/notes"],
      lastCommit: { sha: "abc", at: "2026-11-06T11:00:00Z", modules: ["@a/notes"] },
      lastPush: { at: "2026-11-06T11:01:00Z" },
      remoteVisibility: "private",
      problem: { kind: "no-config", message: "No config", since: "2026-11-06T10:00:00Z" },
    };
    assert.deepEqual(readStatus(status), status);
  });

  test("drops malformed parts and keeps the rest", () => {
    const status = readStatus({
      heartbeat: "2026-11-06T12:00:00Z",
      installed: [{ id: "@a/notes", name: "Notes", folder: "notes" }, { id: "@a/b" }, "x"],
      ownRepositories: "nope",
      lastCommit: { sha: 1 },
      lastPush: 4,
      remoteVisibility: "weird",
      problem: { kind: "other", message: "m", since: "s" },
    });
    assert.deepEqual(status, {
      heartbeat: "2026-11-06T12:00:00Z",
      installed: [{ id: "@a/notes", name: "Notes", folder: "notes" }],
      ownRepositories: [],
    });
  });
});

describe("isEngineRunning", () => {
  const status = (seconds: number) => readStatus({ heartbeat: secondsAgo(seconds) });

  test("is stopped without a status", () => {
    assert.equal(isEngineRunning(null, null, NOW), false);
  });

  test("tolerates 2 x interval + 10 seconds, 60 s interval by default", () => {
    assert.equal(isEngineRunning(status(130), null, NOW), true);
    assert.equal(isEngineRunning(status(131), null, NOW), false);
  });

  test("follows the interval of the config", () => {
    const config = readConfig({ intervalSeconds: 600 });
    assert.equal(isEngineRunning(status(1210), config, NOW), true);
    assert.equal(isEngineRunning(status(1211), config, NOW), false);
  });

  test("is stopped when the heartbeat cannot be parsed", () => {
    assert.equal(isEngineRunning(readStatus({ heartbeat: "yesterday" }), null, NOW), false);
  });
});

describe("widgetState", () => {
  const problem = (kind: string) => ({ kind, message: "m", since: secondsAgo(500) });
  const status = (extra: Record<string, unknown> = {}, seconds = 5) => readStatus({ heartbeat: secondsAgo(seconds), ...extra });

  test("is stopped without a status", () => {
    assert.deepEqual(widgetState(null, null, NOW), { kind: "stopped" });
  });

  test("is up to date when the engine runs with no problem", () => {
    assert.deepEqual(widgetState(status(), null, NOW), { kind: "ok" });
    assert.deepEqual(widgetState(status({ remoteVisibility: "private" }), null, NOW), { kind: "ok" });
    assert.deepEqual(widgetState(status({ remoteVisibility: "unknown" }), null, NOW), { kind: "ok" });
  });

  test("alerts on the engine section for a problem of a running engine", () => {
    for (const kind of ["push-rejected", "auth", "remote-unreachable", "git-missing", "not-a-modules-folder"]) {
      assert.deepEqual(widgetState(status({ problem: problem(kind) }), null, NOW), { kind: "alert", section: "engine" }, kind);
    }
  });

  test("alerts on the settings section when there is no config", () => {
    assert.deepEqual(widgetState(status({ problem: problem("no-config") }), null, NOW), { kind: "alert", section: "settings" });
  });

  test("alerts on the settings section for a public remote", () => {
    assert.deepEqual(widgetState(status({ remoteVisibility: "public" }), null, NOW), { kind: "alert", section: "settings" });
  });

  test("a problem wins over a public remote", () => {
    const pushRejected = status({ problem: problem("push-rejected"), remoteVisibility: "public" });
    assert.deepEqual(widgetState(pushRejected, null, NOW), { kind: "alert", section: "engine" });
  });

  test("a stale heartbeat is stopped, whatever the problem or the remote", () => {
    assert.deepEqual(widgetState(status({ problem: problem("auth") }, 131), null, NOW), { kind: "stopped" });
    assert.deepEqual(widgetState(status({ remoteVisibility: "public" }, 131), null, NOW), { kind: "stopped" });
  });

  test("follows the interval of the config for staleness", () => {
    const config = readConfig({ intervalSeconds: 600 });
    const beat = (seconds: number) => status({ remoteVisibility: "public" }, seconds);
    assert.deepEqual(widgetState(beat(1210), config, NOW), { kind: "alert", section: "settings" });
    assert.deepEqual(widgetState(beat(1211), config, NOW), { kind: "stopped" });
  });
});

describe("relativeTime", () => {
  test("in English", () => {
    setLocale("en");
    assert.equal(relativeTime(secondsAgo(30), NOW), "just now");
    assert.equal(relativeTime(secondsAgo(-3600), NOW), "just now");
    assert.equal(relativeTime(secondsAgo(60), NOW), "1 minute ago");
    assert.equal(relativeTime(secondsAgo(59 * 60), NOW), "59 minutes ago");
    assert.equal(relativeTime(secondsAgo(3600), NOW), "1 hour ago");
    assert.equal(relativeTime(secondsAgo(5 * 3600), NOW), "5 hours ago");
    assert.equal(relativeTime(secondsAgo(86400), NOW), "1 day ago");
    assert.equal(relativeTime(secondsAgo(3 * 86400), NOW), "3 days ago");
  });

  test("in French", () => {
    setLocale("fr-FR");
    assert.equal(relativeTime(secondsAgo(10), NOW), "à l'instant");
    assert.equal(relativeTime(secondsAgo(120), NOW), "il y a 2 minutes");
    assert.equal(relativeTime(secondsAgo(3600), NOW), "il y a 1 heure");
    assert.equal(relativeTime(secondsAgo(2 * 86400), NOW), "il y a 2 jours");
    setLocale("en");
  });

  test("an unreadable date reads as just now", () => {
    assert.equal(relativeTime("nope", NOW), "just now");
  });
});

describe("listedModules", () => {
  const status = readStatus({
    heartbeat: secondsAgo(0),
    installed: [
      { id: "@craftskillz/notes", name: "Notes", folder: "notes" },
      { id: MODULE, name: "Git Integration", folder: "git" },
      { id: "@craftskillz/budget", name: "Budget", folder: "budget" },
    ],
  });
  const config = readConfig({ dataModules: ["@craftskillz/notes"] });

  test("sorts by name, leaves this Module out and checks the versioned ones", () => {
    assert.deepEqual(listedModules(status, config, ["@craftskillz/notes", "@craftskillz/budget"]), [
      { id: "@craftskillz/budget", name: "Budget", versioned: false, isNew: false },
      { id: "@craftskillz/notes", name: "Notes", versioned: true, isNew: false },
    ]);
  });

  test("flags nothing on the first visit", () => {
    assert.ok(listedModules(status, config, null).every((module) => !module.isNew));
  });

  test("flags the Modules that are not in seen", () => {
    const flagged = listedModules(status, config, ["@craftskillz/notes"]).filter((module) => module.isNew);
    assert.deepEqual(flagged.map((module) => module.id), ["@craftskillz/budget"]);
  });

  test("is empty without a status", () => {
    assert.deepEqual(listedModules(null, config, []), []);
  });
});

describe("readSeen", () => {
  test("is null when there is no seen key or it is invalid", () => {
    assert.equal(readSeen(null), null);
    assert.equal(readSeen({}), null);
    assert.equal(readSeen(["a", 1]), null);
  });

  test("reads a list of ids", () => {
    assert.deepEqual(readSeen(["a", "b"]), ["a", "b"]);
    assert.deepEqual(readSeen([]), []);
  });
});

describe("withDataModule", () => {
  test("adds an id, sorted and without duplicates, leaving the config untouched", () => {
    const config = readConfig({ remote: "r", dataModules: ["@b/x"] });
    const next = withDataModule(withDataModule(config, "@a/y", true), "@a/y", true);
    assert.deepEqual(next.dataModules, ["@a/y", "@b/x"]);
    assert.equal(next.remote, "r");
    assert.deepEqual(config.dataModules, ["@b/x"]);
  });

  test("removes an id", () => {
    const config = readConfig({ dataModules: ["@a/y", "@b/x"] });
    assert.deepEqual(withDataModule(config, "@a/y", false).dataModules, ["@b/x"]);
  });
});

describe("restoreFolder", () => {
  test("is the last path segment of the remote without .git", () => {
    assert.equal(restoreFolder("git@github.com:me/tessello-data.git"), "tessello-data");
    assert.equal(restoreFolder("https://github.com/me/backup"), "backup");
  });

  test("ignores a trailing slash and surrounding whitespace", () => {
    assert.equal(restoreFolder("https://host/x/data.git/"), "data");
    assert.equal(restoreFolder("  git@github.com:me/data.git \n"), "data");
  });

  test("is tessello when there is no usable segment", () => {
    assert.equal(restoreFolder(""), "tessello");
    assert.equal(restoreFolder("   "), "tessello");
    assert.equal(restoreFolder("/"), "tessello");
    assert.equal(restoreFolder(".git"), "tessello");
  });

  test("is tessello when the name is not safe to paste in a shell", () => {
    assert.equal(restoreFolder("https://host/me/a b"), "tessello");
    assert.equal(restoreFolder("https://host/me/x;rm"), "tessello");
    assert.equal(restoreFolder("https://host/me/.."), "tessello");
    assert.equal(restoreFolder("https://host/me/."), "tessello");
  });
});

describe("restoreCommands", () => {
  test("clones the remote entered and syncs the folder it creates", () => {
    assert.deepEqual(restoreCommands("git@github.com:me/data.git"), {
      clone: "git clone git@github.com:me/data.git data",
      sync: "npx tessello sync data",
    });
  });

  test("stands <remote> in for an empty remote", () => {
    assert.deepEqual(restoreCommands("  "), {
      clone: "git clone <remote> tessello",
      sync: "npx tessello sync tessello",
    });
  });

  test("single-quotes a remote with whitespace or shell metacharacters", () => {
    assert.equal(restoreCommands("https://host/me/my repo.git").clone, "git clone 'https://host/me/my repo.git' tessello");
    assert.equal(restoreCommands("https://host/a;b").clone, "git clone 'https://host/a;b' tessello");
  });

  test("escapes a single quote inside the quoted remote", () => {
    assert.equal(restoreCommands("https://host/it's").clone, "git clone 'https://host/it'\\''s' tessello");
  });
});

describe("unversionedModules", () => {
  const status = readStatus({
    heartbeat: secondsAgo(0),
    installed: [
      { id: "@craftskillz/notes", name: "Notes", folder: "notes" },
      { id: MODULE, name: "Git Integration", folder: "git" },
      { id: "@craftskillz/budget", name: "Budget", folder: "budget" },
      { id: "@craftskillz/todo", name: "Todo", folder: "todo" },
    ],
  });

  test("lists the Modules whose data is not versioned, sorted by name, this Module left out", () => {
    assert.deepEqual(unversionedModules(status, readConfig({ dataModules: ["@craftskillz/notes"] })), [
      { id: "@craftskillz/budget", name: "Budget" },
      { id: "@craftskillz/todo", name: "Todo" },
    ]);
  });

  test("is empty when every Module is versioned or there is no status", () => {
    const all = readConfig({ dataModules: ["@craftskillz/notes", "@craftskillz/budget", "@craftskillz/todo"] });
    assert.deepEqual(unversionedModules(status, all), []);
    assert.deepEqual(unversionedModules(null, readConfig(null)), []);
  });
});
