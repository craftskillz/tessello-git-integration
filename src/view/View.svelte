<script lang="ts">
  import type { ConnectedModule } from "@tessello/sdk";

  let { host }: { host: ConnectedModule } = $props();
</script>

<main>
  <h1>Git Integration</h1>
  <p>Back up your Tessello space to a git repository.</p>
</main>

<style>
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
</style>
