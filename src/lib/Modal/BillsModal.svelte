<script lang="ts">
  import Modal from "$lib/Modal/Index.svelte";
  import Bills from "$lib/Main/Bills.svelte";
  import { lang } from "$lib/Stores";

  let { isOpen, sel }: { isOpen: boolean; sel?: any } = $props();
</script>

{#if isOpen}
  <Modal size="large">
    {#snippet title()}
      <h2>{$lang("bills") || "Kućni računi"}</h2>
    {/snippet}

    <div style:padding="0.5rem 0">
      <Bills sel={sel || { name: "Kućni računi" }} />
    </div>
  </Modal>
{/if}
