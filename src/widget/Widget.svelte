<script lang="ts">
  // The Widget (size S): a dot and a word for the state of the backup, the time of the last commit, and a way into the View.
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

<button class="widget" onclick={open} aria-label={loaded ? t("widget_label", { state: word, commit: lastCommit }) : t("title")}>
  {#if loaded}
    <span class="state"><span class="dot {state.kind}" aria-hidden="true"></span>{word}</span>
    <span class="commit">{lastCommit}</span>
  {/if}
</button>

<style>
  .widget {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.5rem;
    overflow: hidden;
    border: none;
    border-radius: 0;
    background: var(--bg);
    text-align: center;
  }
  .state {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-weight: 600;
    color: var(--ink);
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
    max-width: 100%;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
