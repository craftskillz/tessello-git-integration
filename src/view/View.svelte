<script lang="ts">
  import type { ConnectedModule } from "@tessello/sdk";
  import { increment, readCount, reset } from "../lib/count.ts";

  let { host }: { host: ConnectedModule } = $props();
  let count = $state(0);
  let error = $state("");

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      count = await readCount(host.storage);
      error = "";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  const refresh = () => run(() => Promise.resolve());

  $effect(() => {
    refresh();
    // The Widget may have changed the count while the View was hidden.
    return host.onVisibilityChange((visible) => visible && refresh());
  });
</script>

<main>
  <h1>My Module</h1>
  <p class="count" aria-label="Count">{count}</p>
  <div class="actions">
    <button class="primary" onclick={() => run(() => increment(host.storage))}>Add one</button>
    <button onclick={() => run(() => reset(host.storage))}>Start again</button>
  </div>
  {#if error}<p role="alert">{error}</p>{/if}
</main>

<style>
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  .count {
    font-size: 4rem;
    font-weight: 700;
    margin: 1rem 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
