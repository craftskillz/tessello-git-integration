<script lang="ts">
  // The state of the backup and its settings: reads `status` (written by the engine), writes `config` and `seen`.
  import type { ConnectedModule } from "@tessello/sdk";
  import { onMount, tick } from "svelte";
  import { t } from "../lib/i18n.ts";
  import {
    type SyncConfig,
    type SyncStatus,
    type ViewSection,
    isEngineRunning,
    listedModules,
    parseInterval,
    readConfig,
    readSeen,
    readStatus,
    relativeTime,
    restoreCommands,
    unversionedModules,
    withDataModule,
  } from "../lib/sync.ts";

  let { host }: { host: ConnectedModule } = $props();

  const POLL_MS = 3000;

  /** The heading of each section the Widget can open the View on. */
  const SECTION_HEADINGS: Record<ViewSection, string> = { engine: "engine-title", settings: "settings-title" };

  const PROBLEM_TEXT = {
    "push-rejected": "problem_push_rejected",
    auth: "problem_auth",
    "remote-unreachable": "problem_remote_unreachable",
    "git-missing": "problem_git_missing",
    "not-a-modules-folder": "problem_not_a_modules_folder",
  } as const;

  let loaded = $state(false);
  let config = $state.raw<SyncConfig>(readConfig(null));
  let status = $state<SyncStatus | null>(null);
  let seenAtOpen = $state<string[] | null>(null);
  let now = $state(Date.now());
  let intervalText = $state("60");
  let intervalInvalid = $state(false);
  let saveError = $state<string | null>(null);
  let copied = $state<string | null>(null);
  let storedSeen: string[] | null = null;

  const running = $derived(isEngineRunning(status, config, now));
  const modules = $derived(listedModules(status, config, seenAtOpen));
  const commands = $derived(restoreCommands(config.remote));
  const unversioned = $derived(unversionedModules(status, config));
  const versionedCount = $derived(modules.filter((module) => module.versioned).length);
  const names = $derived(new Map(status?.installed.map((module) => [module.id, module.name]) ?? []));

  async function refresh(): Promise<void> {
    status = readStatus(await host.storage.get("status"));
    now = Date.now();
    await rememberSeen();
  }

  /** Writes `seen` when the listed Modules are not all in it yet. */
  async function rememberSeen(): Promise<void> {
    if (!status) return;
    const ids = listedModules(status, config, null).map((module) => module.id);
    if (storedSeen && ids.length === storedSeen.length && ids.every((id) => storedSeen!.includes(id))) return;
    try {
      await host.storage.set("seen", ids);
      storedSeen = ids;
    } catch {
      // Remembering is a courtesy: the badge shows again next time.
    }
  }

  async function save(next: SyncConfig): Promise<void> {
    config = next;
    try {
      await host.storage.set("config", next);
      saveError = null;
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
    }
  }

  function changeInterval(): void {
    const seconds = parseInterval(intervalText);
    intervalInvalid = seconds === null;
    if (seconds !== null) void save({ ...config, intervalSeconds: seconds });
  }

  async function copyCommand(id: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copied = id;
      setTimeout(() => copied === id && (copied = null), 2000);
    } catch {
      // Copying is a convenience: the command stays on screen to select.
    }
  }

  /** Scrolls the section the Widget asked for into view; other values are ignored. */
  async function showSection(params: Record<string, string> | undefined): Promise<void> {
    const section = params?.section;
    if (section !== "engine" && section !== "settings") return;
    const id = SECTION_HEADINGS[section];
    await tick();
    document.getElementById(id)?.scrollIntoView();
  }

  onMount(() => {
    let visible = true;
    void (async () => {
      config = readConfig(await host.storage.get("config"));
      intervalText = String(config.intervalSeconds);
      seenAtOpen = readSeen(await host.storage.get("seen"));
      storedSeen = seenAtOpen;
      await refresh();
      loaded = true;
      await showSection(host.context.params);
    })();
    const stopNavigation = host.onNavigationParams((params) => void showSection(params));
    const timer = setInterval(() => visible && loaded && void refresh(), POLL_MS);
    const stop = host.onVisibilityChange((isVisible) => {
      visible = isVisible;
      if (isVisible && loaded) void refresh();
    });
    return () => {
      clearInterval(timer);
      stop();
      stopNavigation();
    };
  });
</script>

<main>
  <h1>{t("title")}</h1>
  <p>{t("intro")}</p>

  {#if loaded}
    <section aria-labelledby="engine-title">
      <h2 id="engine-title">{t("section_engine")}</h2>
      {#if !running}
        <p>{t("engine_stopped")}</p>
        <p>{t("engine_start_instruction")}</p>
        <p class="command">
          <code>{t("engine_command")}</code>
          <button type="button" aria-label={t("copy_label")} onclick={() => copyCommand("engine", t("engine_command"))}>{copied === "engine" ? t("copied") : t("copy")}</button>
        </p>
      {:else}
        <p>{t("engine_running")}</p>
        {#if status?.lastCommit}
          <p>
            {t("last_commit", { when: relativeTime(status.lastCommit.at, now) })}
            {#if status.lastCommit.modules.length > 0}
              {t("commit_touching", { modules: status.lastCommit.modules.map((id) => names.get(id) ?? id).join(", ") })}
            {/if}
          </p>
        {:else}
          <p>{t("no_commit")}</p>
        {/if}
        <p>{status?.lastPush ? t("last_push", { when: relativeTime(status.lastPush.at, now) }) : t("no_push")}</p>
      {/if}
      {#if running && status?.problem}
        {#if status.problem.kind === "no-config"}
          <p class="problem">{t("problem_no_config")}</p>
        {:else}
          <div class="problem">
            <p>{t(PROBLEM_TEXT[status.problem.kind])}</p>
            <p class="muted">{t("problem_since", { when: relativeTime(status.problem.since, now) })}</p>
            <details>
              <summary>{t("problem_message")}</summary>
              <pre>{status.problem.message}</pre>
            </details>
          </div>
        {/if}
      {/if}
    </section>

    <section aria-labelledby="settings-title">
      <h2 id="settings-title">{t("section_settings")}</h2>
      <label class="field">
        {t("field_remote")}
        <input
          type="text"
          value={config.remote}
          placeholder={t("field_remote_placeholder")}
          oninput={(event) => void save({ ...config, remote: event.currentTarget.value })}
        />
      </label>
      <p class="muted">{t("private_recommendation")}</p>
      {#if status?.remoteVisibility === "public"}
        <p class="problem">
          {versionedCount === 0
            ? t("public_warning_none")
            : versionedCount === 1
              ? t("public_warning_one")
              : t("public_warning_many", { count: versionedCount })}
        </p>
      {/if}
      <label class="check">
        <input type="checkbox" checked={config.push} onchange={(event) => void save({ ...config, push: event.currentTarget.checked })} />
        {t("field_push")}
      </label>
      <label class="field">
        {t("field_interval")}
        <input
          type="text"
          inputmode="numeric"
          bind:value={intervalText}
          oninput={changeInterval}
          aria-invalid={intervalInvalid}
          aria-describedby="interval-hint"
        />
      </label>
      <p id="interval-hint" class="muted">{intervalInvalid ? t("field_interval_error") : t("field_interval_hint")}</p>
      {#if saveError}
        <p role="alert" class="problem">{t("save_error", { reason: saveError })}</p>
      {/if}
    </section>

    <section aria-labelledby="modules-title">
      <h2 id="modules-title">{t("section_modules")}</h2>
      {#if modules.length > 0}
        <ul>
          {#each modules as module (module.id)}
            <li>
              <label class="check">
                <input
                  type="checkbox"
                  checked={module.versioned}
                  aria-label={t("module_version_label", { name: module.name })}
                  onchange={(event) => void save(withDataModule(config, module.id, event.currentTarget.checked))}
                />
                <span class="name">{module.name}</span>
                <span class="muted">{t("module_version_data")}</span>
                {#if module.isNew}<span class="badge">{t("module_new")}</span>{/if}
              </label>
            </li>
          {/each}
        </ul>
        <p class="muted">{t("modules_secrets_warning")}</p>
      {:else}
        <p class="muted">{status ? t("modules_empty") : t("modules_empty_stopped")}</p>
      {/if}
    </section>

    {#if status && status.ownRepositories.length > 0}
      <section aria-labelledby="own-title">
        <h2 id="own-title">{t("own_repositories")}</h2>
        <ul>
          {#each status.ownRepositories as folder (folder)}
            <li><code>{folder}</code></li>
          {/each}
        </ul>
      </section>
    {/if}

    <section aria-labelledby="restore-title">
      <h2 id="restore-title">{t("section_restore")}</h2>
      <ol>
        <li>
          {t("restore_step_clone")}
          <p class="command">
            <code>{commands.clone}</code>
            <button type="button" aria-label={t("copy_clone_label")} onclick={() => copyCommand("clone", commands.clone)}>
              {copied === "clone" ? t("copied") : t("copy")}
            </button>
          </p>
        </li>
        <li>{t("restore_step_choose", { button: t("restore_choose_button") })}</li>
        <li>
          {t("restore_step_sync")}
          <p class="command">
            <code>{commands.sync}</code>
            <button type="button" aria-label={t("copy_sync_label")} onclick={() => copyCommand("sync", commands.sync)}>
              {copied === "sync" ? t("copied") : t("copy")}
            </button>
          </p>
        </li>
      </ol>
      {#if unversioned.length > 0}
        <p class="muted">{t("restore_unversioned", { names: unversioned.map((module) => module.name).join(", ") })}</p>
      {/if}
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }
  section {
    margin-top: 1.5rem;
  }
  .field {
    display: block;
    margin-top: 0.75rem;
  }
  .field input[type="text"] {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-top: 0.25rem;
    padding: 0.4em 0.6em;
    font: inherit;
    color: var(--ink);
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .field input[aria-invalid="true"] {
    border-color: #c0392b;
  }
  .check {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  ol {
    padding-left: 1.25rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .command {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  code {
    padding: 0.2em 0.5em;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }
  .muted {
    color: var(--muted);
  }
  .problem {
    color: #c0392b;
  }
  pre {
    margin: 0.25rem 0 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .name {
    font-weight: 600;
  }
  .badge {
    padding: 0 0.5em;
    font-size: 0.8em;
    color: #fff;
    background: var(--accent);
    border-radius: 999px;
  }
</style>
