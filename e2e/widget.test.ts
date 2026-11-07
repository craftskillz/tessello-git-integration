// The Widget: the state of the backup in a dot and a word, the last commit, its re-reading when shown, and its way into
// the View (on the section that explains an alert).

import assert from "node:assert/strict";
import { test } from "node:test";
import { until } from "@tessello/sdk/testing";
import { engineStatus, minutesAgo, openWidget, useBrowser } from "./git-integration.ts";

useBrowser();

const CONFIG = { remote: "git@github.com:me/backup.git", push: true, intervalSeconds: 60, dataModules: [] };
const problem = { kind: "auth", message: "Permission denied", since: minutesAgo(10) };

test("without a status the Widget says Stopped, and Open opens the View without params", async () => {
  const { page, host } = await openWidget();
  await page.getByText("Stopped", { exact: true }).waitFor();
  await page.getByText("No commit yet").waitFor();
  await page.getByRole("button", { name: "Open ↗" }).click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{}]);
});

test("a running engine without problem says Up to date with the time of the last commit, and Open opens the View without params", async () => {
  const { page, host } = await openWidget({
    storage: { config: CONFIG, status: engineStatus({ lastCommit: { sha: "abc", at: minutesAgo(3), modules: [] } }) },
  });
  await page.getByText("Up to date", { exact: true }).waitFor();
  await page.getByText("3 minutes ago").waitFor();
  // Among the other Widgets of the Home, the state alone would not say which Module it is: a heading names it, as in
  // the other Modules, and its text can be selected.
  await page.getByRole("heading", { name: "Git Integration" }).waitFor({ timeout: 2000 });
  await page.getByRole("button", { name: "Open ↗" }).click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{}]);
});

test("a problem says Alert and Open opens the View on its engine section", async () => {
  const { page, host } = await openWidget({ storage: { config: CONFIG, status: engineStatus({ problem }) } });
  await page.getByText("Alert", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Open ↗" }).click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{ section: "engine" }]);
});

test("a public remote says Alert and Open opens the View on its settings section", async () => {
  const { page, host } = await openWidget({ storage: { config: CONFIG, status: engineStatus({ remoteVisibility: "public" }) } });
  await page.getByText("Alert", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Open ↗" }).click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{ section: "settings" }]);
});

test("the Widget reads the status again when it is shown after being hidden", async () => {
  const { page, host, surface } = await openWidget({ storage: { config: CONFIG, status: engineStatus() } });
  await page.getByText("Up to date", { exact: true }).waitFor();
  surface.setVisible(false);
  await host.storage.set("status", engineStatus({ problem }));
  surface.setVisible(true);
  await page.getByText("Alert", { exact: true }).waitFor();
});

test("the Widget speaks French", async () => {
  const { page } = await openWidget({ locale: "fr", storage: { config: CONFIG, status: engineStatus({ lastCommit: { sha: "abc", at: minutesAgo(180), modules: [] } }) } });
  await page.getByText("À jour", { exact: true }).waitFor();
  await page.getByText("il y a 3 heures").waitFor();
  await page.getByRole("button", { name: "Ouvrir ↗" }).waitFor();
});

for (const theme of ["light", "dark"] as const) {
  for (const locale of ["en", "fr"]) {
    test(`the Widget fills its cell without scrolling (${theme}, ${locale})`, async () => {
      const { page } = await openWidget({
        theme,
        locale,
        storage: { config: CONFIG, status: engineStatus({ lastCommit: { sha: "abc", at: minutesAgo(180), modules: [] } }) },
      });
      await page.getByText(locale === "fr" ? "À jour" : "Up to date", { exact: true }).waitFor();
      assert.ok(
        await page.locator("body").evaluate((body) => body.scrollHeight <= innerHeight && body.scrollWidth <= innerWidth),
        "the Widget does not scroll",
      );
    });
  }
}
