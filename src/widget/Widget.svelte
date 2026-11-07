<script lang="ts">
  // The Widget (size S): the Module's name and its Open button, as in the other Modules, then a dot and a word for the state
  // of the backup and the time of the last commit. Open goes to the section that explains an alert.
  import type { ConnectedModule } from "@tessello/sdk";
  import { onMount } from "svelte";
  import { t } from "../lib/i18n.ts";
  import { type SyncConfig, type SyncStatus, readConfig, readStatus, relativeTime, widgetState } from "../lib/sync.ts";

  let { host }: { host: ConnectedModule } = $props();

  const POLL_MS = 10_000;

  let config = $state.raw<SyncConfig>(readConfig(null));
  let status = $state<SyncStatus | null>(null);
  let now = $state(Date.now());
  let loaded = $state(false);

  const state = $derived(widgetState(status, config, now));
  const word = $derived(state.kind === "ok" ? t("widget_ok") : state.kind === "alert" ? t("widget_alert") : t("widget_stopped"));
  const lastCommit = $derived(status?.lastCommit ? relativeTime(status.lastCommit.at, now) : t("no_commit"));

  async function refresh(): Promise<void> {
    let nextConfig, nextStatus;
    try {
      [nextConfig, nextStatus] = await Promise.all([host.storage.get("config"), host.storage.get("status")]);
    } catch {
      return; // Read again at the next round.
    }
    config = readConfig(nextConfig);
    status = readStatus(nextStatus);
    now = Date.now();
    loaded = true;
  }

  function open(): void {
    void (state.kind === "alert" ? host.openView({ section: state.section }) : host.openView());
  }

  onMount(() => {
    let visible = true;
    void refresh();
    const timer = setInterval(() => visible && void refresh(), POLL_MS);
    const stop = host.onVisibilityChange((isVisible) => {
      visible = isVisible;
      if (isVisible) void refresh();
    });
    return () => {
      clearInterval(timer);
      stop();
    };
  });
</script>

<div class="widget">
  <header>
    <h1>{t("title")}</h1>
    <button type="button" class="pill" onclick={open}>{t("widget_open")} ↗</button>
  </header>

  {#if loaded}
    <p class="state"><span class="dot {state.kind}" aria-hidden="true"></span>{word}</p>
    <p class="commit">{lastCommit}</p>
  {/if}
</div>

<style>
  /* The Widget fills its cell and never scrolls (CONVENTION.md §7.1): what does not fit is cut off. */
  .widget {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100vh;
    box-sizing: border-box;
    padding: 10px 12px;
    overflow: hidden;
    font-size: 12px;
  }
  header {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
    /* A size S cell is too narrow for the name and Open on one line: the name wraps between its words rather than being
       cut off. */
  }
  .pill {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 2px 10px;
    background: var(--panel);
    color: var(--accent);
    font: inherit;
    font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
  }
  .pill:hover {
    border-color: var(--accent);
  }
  .state {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-weight: 700;
  }
  .dot {
    flex: none;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--muted);
  }
  .dot.ok {
    background: #2e9e5b;
  }
  .dot.alert {
    background: #d9482b;
  }
  .commit {
    margin: 0;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
