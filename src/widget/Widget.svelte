<script lang="ts">
  import type { ConnectedModule } from "@tessello/sdk";

  let { host }: { host: ConnectedModule } = $props();
</script>

<button class="widget" onclick={() => host.openView()} aria-label="Open Git Integration">
  <span class="label">Git Integration</span>
</button>

<style>
  .widget {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0;
  }
  .label {
    color: var(--muted);
    font-size: 0.85rem;
  }
</style>
