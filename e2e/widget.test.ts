// The Widget: the state of the backup in a dot and a word, the last commit, its re-reading when shown, and its way into
// the View (on the section that explains an alert).

import assert from "node:assert/strict";
import { test } from "node:test";
import { until } from "@tessello/sdk/testing";
import { engineStatus, minutesAgo, openWidget, useBrowser } from "./git-integration.ts";

useBrowser();

const CONFIG = { remote: "git@github.com:me/backup.git", push: true, intervalSeconds: 60, dataModules: [] };
const problem = { kind: "auth", message: "Permission denied", since: minutesAgo(10) };

test("without a status the Widget says Stopped, and a click opens the View without params", async () => {
  const { page, host } = await openWidget();
  await page.getByRole("button", { name: /Stopped/ }).waitFor();
  await page.getByText("No commit yet").waitFor();
  await page.getByRole("button").click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{}]);
});

test("a running engine without problem says Up to date with the time of the last commit, and a click opens the View without params", async () => {
  const { page, host } = await openWidget({
    storage: { config: CONFIG, status: engineStatus({ lastCommit: { sha: "abc", at: minutesAgo(3), modules: [] } }) },
  });
  await page.getByRole("button", { name: /Up to date/ }).waitFor();
  await page.getByText("3 minutes ago").waitFor();
  // Among the other Widgets of the Home, the state alone would not say which Module it is.
  await page.getByText("Git Integration", { exact: true }).waitFor({ timeout: 2000 });
  await page.getByRole("button").click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{}]);
});

test("a problem says Alert and a click opens the View on its engine section", async () => {
  const { page, host } = await openWidget({ storage: { config: CONFIG, status: engineStatus({ problem }) } });
  await page.getByRole("button", { name: /Alert/ }).waitFor();
  await page.getByRole("button").click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{ section: "engine" }]);
});

test("a public remote says Alert and a click opens the View on its settings section", async () => {
  const { page, host } = await openWidget({ storage: { config: CONFIG, status: engineStatus({ remoteVisibility: "public" }) } });
  await page.getByRole("button", { name: /Alert/ }).waitFor();
  await page.getByRole("button").click();
  await until(() => host.openedViews.length === 1, "the click to open the View");
  assert.deepEqual(host.openedViews, [{ section: "settings" }]);
});

test("the Widget reads the status again when it is shown after being hidden", async () => {
  const { page, host, surface } = await openWidget({ storage: { config: CONFIG, status: engineStatus() } });
  await page.getByRole("button", { name: /Up to date/ }).waitFor();
  surface.setVisible(false);
  await host.storage.set("status", engineStatus({ problem }));
  surface.setVisible(true);
  await page.getByRole("button", { name: /Alert/ }).waitFor();
});

test("the Widget speaks French", async () => {
  const { page } = await openWidget({ locale: "fr", storage: { config: CONFIG, status: engineStatus({ lastCommit: { sha: "abc", at: minutesAgo(180), modules: [] } }) } });
  await page.getByRole("button", { name: /À jour/ }).waitFor();
  await page.getByText("il y a 3 heures").waitFor();
  assert.match((await page.getByRole("button").getAttribute("aria-label")) ?? "", /Ouvrir Git Integration/);
});

for (const theme of ["light", "dark"] as const) {
  for (const locale of ["en", "fr"]) {
    test(`the Widget fills its cell without scrolling (${theme}, ${locale})`, async () => {
      const { page } = await openWidget({
        theme,
        locale,
        storage: { config: CONFIG, status: engineStatus({ lastCommit: { sha: "abc", at: minutesAgo(180), modules: [] } }) },
      });
      await page.getByRole("button", { name: locale === "fr" ? /À jour/ : /Up to date/ }).waitFor();
      assert.ok(
        await page.locator("body").evaluate((body) => body.scrollHeight <= innerHeight && body.scrollWidth <= innerWidth),
        "the Widget does not scroll",
      );
    });
  }
}
