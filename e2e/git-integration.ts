// What the browser tests of Git Integration share: its built package served from dist/, its View opened in Chromium
// against the Test Host of the SDK, and the statuses the `tessello sync` engine would write. Every wait goes through
// `until` or Playwright's own wait for an element, never through a fixed time.

import type { Json } from "@tessello/sdk";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, before } from "node:test";
import { type Browser, chromium, type Page } from "playwright";
import { createTestHost, type FolderServer, serveFolder, slowDownCpu, type TestHost, type TestHostOptions, type TestSurface, WIDGET_SIZES } from "@tessello/sdk/testing";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(await readFile(`${DIST}manifest.json`, "utf8").catch(() => {
  throw new Error("No dist/: run `npm run build` before the browser tests.");
}));
const module = { id: manifest.id as string, version: manifest.version as string };

let browser: Browser;
let server: FolderServer;

/** Serves dist/ and starts Chromium for the tests of the file that calls it. */
export function useBrowser(): void {
  before(async () => {
    server = await serveFolder(DIST);
    browser = await chromium.launch();
  });
  after(async () => {
    await browser?.close();
    await server?.close();
  });
}

export interface Opened {
  page: Page;
  host: TestHost;
  surface: TestSurface;
}

interface OpenOptions {
  storage?: TestHostOptions["storage"];
  locale?: string;
  viewport?: { width: number; height: number };
  theme?: TestHostOptions["theme"];
  /** View only: the params it is opened with, as from the Widget. */
  params?: Record<string, string>;
}

/** Opens the View on a Test Host of its own and waits until it shows its settings. */
export async function openView(options: OpenOptions = {}): Promise<Opened> {
  const host = createTestHost({ module, storage: options.storage, locale: options.locale, theme: options.theme });
  const context = await browser.newContext(options.viewport ? { viewport: options.viewport } : {});
  const page = await context.newPage();
  await slowDownCpu(page);
  const surface = await host.attach(page, { surface: "view", params: options.params });
  await page.goto(`${server.url}/${manifest.view.entry}`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.locator("section[aria-labelledby]").first().waitFor();
  return { page, host, surface };
}

/** Opens the Widget at its size on a Test Host of its own. */
export async function openWidget(options: Omit<OpenOptions, "viewport" | "params"> = {}): Promise<Opened> {
  const host = createTestHost({ module, storage: options.storage, locale: options.locale, theme: options.theme });
  const context = await browser.newContext({ viewport: WIDGET_SIZES[manifest.widget.size as "S" | "M" | "L"] });
  const page = await context.newPage();
  await slowDownCpu(page);
  const surface = await host.attach(page, { surface: "widget" });
  await page.goto(`${server.url}/${manifest.widget.entry}`);
  await page.getByRole("button").waitFor();
  return { page, host, surface };
}

/** A status as the engine writes it: a heartbeat `secondsAgo`, other fields as given. */
export function engineStatus(fields: Record<string, unknown> = {}, secondsAgo = 5) {
  return {
    heartbeat: new Date(Date.now() - secondsAgo * 1000).toISOString(),
    installed: [],
    ownRepositories: [],
    ...fields,
  } as unknown as Exclude<Json, null>;
}

/** The config the View wrote, as the engine reads it. */
export const storedConfig = async (host: TestHost) => (await host.storage.get("config")) as { remote: string; push: boolean; intervalSeconds: number; dataModules: string[] };

export const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
