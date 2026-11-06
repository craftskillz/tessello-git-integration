<script lang="ts">
  import type { ConnectedModule } from "@tessello/sdk";
  import { readCount } from "../lib/count.ts";

  let { host }: { host: ConnectedModule } = $props();
  let count = $state(0);

  const load = async () => (count = await readCount(host.storage));
  $effect(() => {
    load();
    // The View may have changed the count while the Home was hidden.
    return host.onVisibilityChange((visible) => visible && load());
  });
</script>

<button class="widget" onclick={() => host.openView()} aria-label="Open My Module">
  <span class="count">{count}</span>
  <span class="label">My Module</span>
</button>

<style>
  .widget {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0;
  }
  .count {
    font-size: 2rem;
    font-weight: 700;
  }
  .label {
    color: var(--muted);
    font-size: 0.85rem;
  }
</style>
