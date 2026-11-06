import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { until } from "@tessello/sdk/testing";
import { engineStatus, minutesAgo, openView, storedConfig, useBrowser } from "./git-integration.ts";

useBrowser();

const NOTES = { id: "@craftskillz/notes", name: "Notes", folder: "notes" };
const TODO = { id: "@craftskillz/todo", name: "Todo", folder: "todo" };
const SELF = { id: "@craftskillz/git-integration", name: "Git Integration", folder: "git-integration" };

describe("the engine", () => {
  test("without a status it is stopped, and the View gives the command to run with a Copy button", async () => {
    const { page } = await openView();
    await page.getByText("The engine is stopped").waitFor();
    await page.locator("code", { hasText: "npx tessello sync" }).waitFor();
    await page.getByRole("button", { name: "Copy the command" }).waitFor();
  });

  test("a stale heartbeat means stopped, and the problem of its last round is not shown", async () => {
    const problem = { kind: "auth", message: "Permission denied", since: minutesAgo(10) };
    const { page } = await openView({ storage: { status: engineStatus({ problem }, 300) } });
    await page.getByText("The engine is stopped").waitFor();
    assert.equal(await page.getByText("Problem: Permission denied").count(), 0);
  });

  test("a fresh heartbeat shows the last commit with the Modules it touched, and the last push", async () => {
    const { page } = await openView({
      storage: { status: engineStatus({ installed: [NOTES], lastCommit: { sha: "abc", at: minutesAgo(3), modules: [NOTES.id] }, lastPush: { at: minutesAgo(10) } }) },
    });
    await page.getByText("The engine is running.").waitFor();
    await page.getByText("Last commit 3 minutes ago").waitFor();
    await page.getByText("touching Notes").waitFor();
    await page.getByText("Last push 10 minutes ago").waitFor();
    assert.equal(await page.getByText("The engine is stopped").count(), 0);
  });

  test("a running engine without commit or push says so", async () => {
    const { page } = await openView({ storage: { status: engineStatus() } });
    await page.getByText("No commit yet").waitFor();
    await page.getByText("No push yet").waitFor();
  });

  test("the no-config problem invites the User to enter the repository", async () => {
    const { page } = await openView({ storage: { status: engineStatus({ problem: { kind: "no-config", message: "x", since: minutesAgo(1) } }) } });
    await page.getByText("Enter the URL of your remote repository").waitFor();
  });

  test("another problem shows its message", async () => {
    const { page } = await openView({ storage: { status: engineStatus({ problem: { kind: "auth", message: "Permission denied", since: minutesAgo(1) } }) } });
    await page.getByText("Problem: Permission denied").waitFor();
  });
});

describe("the settings", () => {
  test("each valid change writes the whole config", async () => {
    const { page, host } = await openView();
    await page.getByLabel("Remote repository URL").fill("git@github.com:me/backup.git");
    await page.getByLabel("Push to the remote repository").uncheck();
    await page.getByLabel("Frequency (seconds)").fill("30");
    await until(
      async () => JSON.stringify(await storedConfig(host)) === JSON.stringify({ remote: "git@github.com:me/backup.git", push: false, intervalSeconds: 30, dataModules: [] }),
      "the config to be written",
    );
  });

  test("an invalid frequency shows an error and is not written", async () => {
    const { page, host } = await openView({ storage: { config: { remote: "r", push: true, intervalSeconds: 40, dataModules: [] } } });
    const interval = page.getByLabel("Frequency (seconds)");
    await interval.fill("5");
    await page.getByText("Enter a whole number of seconds between 10 and 3600.").waitFor();
    assert.equal(await interval.getAttribute("aria-invalid"), "true");
    await page.getByLabel("Remote repository URL").fill("other"); // a valid change still must not carry the invalid interval
    await until(async () => (await storedConfig(host)).remote === "other", "the remote to be written");
    assert.equal((await storedConfig(host)).intervalSeconds, 40);
  });

  test("checking a Module versions its data", async () => {
    const { page, host } = await openView({ storage: { status: engineStatus({ installed: [NOTES, TODO] }) } });
    await page.getByLabel("Version the data of Notes").check();
    await until(async () => (await storedConfig(host)).dataModules.join() === NOTES.id, "dataModules to be written");
    await page.getByLabel("Version the data of Todo").check();
    await page.getByLabel("Version the data of Notes").uncheck();
    await until(async () => (await storedConfig(host)).dataModules.join() === TODO.id, "dataModules to change");
  });

  test("a refused write shows an alert with the reason", async () => {
    const { page, host } = await openView();
    host.refuseWrites({ key: "config", message: "disk full" });
    await page.getByLabel("Remote repository URL").fill("x");
    await page.getByRole("alert").filter({ hasText: "disk full" }).waitFor();
  });
});

describe("the list of Modules", () => {
  test("without a status or with an empty list it explains why it is empty", async () => {
    const stopped = await openView();
    await stopped.page.getByText("The list appears once the engine has run.").waitFor();
    const empty = await openView({ storage: { status: engineStatus() } });
    await empty.page.getByText("No Modules installed yet.").waitFor();
  });

  test("a Module new since the last visit is badged, this Module is not listed, and seen is updated", async () => {
    const { page, host } = await openView({ storage: { seen: [NOTES.id], status: engineStatus({ installed: [NOTES, TODO, SELF] }) } });
    const items = page.getByRole("listitem");
    await items.filter({ hasText: "Todo" }).getByText("New", { exact: true }).waitFor();
    assert.equal(await items.filter({ hasText: "Notes" }).getByText("New", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Git Integration", { exact: true }).count(), 1, "only the title");
    await until(async () => JSON.stringify(await host.storage.get("seen")) === JSON.stringify([NOTES.id, TODO.id]), "seen to be written");
    assert.equal(await items.filter({ hasText: "Todo" }).getByText("New", { exact: true }).count(), 1, "the badge stays for this visit");
  });

  test("the warning about secrets is shown", async () => {
    const { page } = await openView({ storage: { status: engineStatus({ installed: [NOTES] }) } });
    await page.getByText("can hold secrets").waitFor();
  });
});

describe("polling the status", () => {
  test("the View picks up a new status while visible, and reads again when shown after being hidden", async () => {
    const { page, host, surface } = await openView();
    await page.getByText("The engine is stopped").waitFor();
    await host.storage.set("status", engineStatus({ installed: [NOTES] }));
    await page.getByText("The engine is running.").waitFor();

    surface.setVisible(false);
    await host.storage.set("status", engineStatus({ installed: [NOTES], lastPush: { at: minutesAgo(7) } }));
    surface.setVisible(true);
    await page.getByText("Last push 7 minutes ago").waitFor();
  });
});

describe("language and layout", () => {
  test("it follows the language of the Host", async () => {
    const { page } = await openView({ locale: "fr-FR" });
    await page.getByText("Le moteur est arrêté").waitFor();
  });

  test("it does not overflow at 360 px", async () => {
    const { page } = await openView({ viewport: { width: 360, height: 700 }, storage: { status: engineStatus({ installed: [NOTES, TODO] , lastCommit: { sha: "a", at: minutesAgo(1), modules: [NOTES.id, TODO.id] } }) } });
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 360);
    const stopped = await openView({ viewport: { width: 360, height: 700 } });
    assert.ok((await stopped.page.evaluate(() => document.documentElement.scrollWidth)) <= 360);
  });
});
