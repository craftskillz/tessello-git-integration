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
