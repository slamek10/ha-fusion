<script lang="ts">
  import { lang, ripple, updateDashboard } from "$lib/Stores";
  import Bills from "$lib/Main/Bills.svelte";
  import ConfigModal from "$lib/Modal/ConfigModal.svelte";
  import Icon from "@iconify/svelte";
  import Ripple from "$lib/Actions/ripple";
  import InputClear from "$lib/Components/InputClear.svelte";
  import Toggle from "$lib/Components/Toggle.svelte";
  import { openModal } from "$lib/Modals";
  import { updateObj } from "$lib/Utils";

  let {
    isOpen,
    sel = $bindable(),
    sectionName = undefined,
  }: {
    isOpen: boolean;
    sel: any;
    sectionName?: string;
  } = $props();

  let name: string | undefined = $state(sel?.name);
  let show_breakdown: boolean = $state(sel?.show_breakdown !== false);
  let show_upload_button: boolean = $state(sel?.show_upload_button !== false);

  function handleBreakdownToggle(val: boolean) {
    show_breakdown = val;
    sel = updateDashboard(sel, (live) => {
      live.show_breakdown = val;
    });
  }

  function handleUploadToggle(val: boolean) {
    show_upload_button = val;
    sel = updateDashboard(sel, (live) => {
      live.show_upload_button = val;
    });
  }

  function openSettingsBillsTab() {
    openModal(() => import("$lib/Settings/Index.svelte"));
  }
</script>

<ConfigModal {isOpen} bind:sel title={$lang("bills") || "Kućni računi"}>
  {#snippet children(set)}
    <h2>{$lang("preview") || "Preview"}</h2>

    <div style:pointer-events="none" style:margin-bottom="1rem">
      <Bills {sel} {sectionName} />
    </div>

    <h2>{$lang("name") || "Name"}</h2>

    <InputClear
      condition={name}
      onclear={() => {
        name = undefined;
        set("name");
      }}
    >
      {#snippet children(padding)}
        <input
          name={$lang("name")}
          class="input"
          type="text"
          placeholder="Kućni računi"
          autocomplete="off"
          spellcheck="false"
          bind:value={name}
          onchange={(event) => set("name", event)}
          style:padding
        />
      {/snippet}
    </InputClear>

    <h2>Opcije prikaza nadzorne ploče</h2>

    <div class="options-list">
      <div class="option-row">
        <div class="option-info">
          <span class="option-label">Pregled po vrstama troškova</span>
          <span class="option-desc"
            >Prikazuje brze kartice za svaku vrstu računa (Internet, Struja,
            Mobitel...)</span
          >
        </div>
        <Toggle
          checked={show_breakdown}
          onchange={(e: any) => handleBreakdownToggle(e.target.checked)}
        />
      </div>

      <div class="option-row">
        <div class="option-info">
          <span class="option-label">Brzi gumbi za prijenos</span>
          <span class="option-desc"
            >Prikazuje gumbe za brzi prijenos PDF/slike računa i ručni unos</span
          >
        </div>
        <Toggle
          checked={show_upload_button}
          onchange={(e: any) => handleUploadToggle(e.target.checked)}
        />
      </div>
    </div>

    <h2>Upravljanje vrstama računa</h2>
    <p class="section-desc">
      Vrste računa (Internet, Struja, Mobitel...), dan plaće i AI skeniranje
      podešavaju se u postavkama.
    </p>
    <button
      type="button"
      class="btn-open-settings"
      onclick={openSettingsBillsTab}
      use:Ripple={$ripple}
    >
      <Icon icon="mdi:cog" />
      <span>Otvori Postavke računa</span>
    </button>
  {/snippet}
</ConfigModal>

<style>
  .options-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    padding: 1rem;
    margin-bottom: 1.25rem;
  }

  .option-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .option-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .option-label {
    font-size: 0.92rem;
    font-weight: 600;
    color: #fff;
  }

  .option-desc {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .section-desc {
    font-size: 0.84rem;
    color: rgba(255, 255, 255, 0.65);
    margin: 0.25rem 0 0.75rem 0;
  }

  .btn-open-settings {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.4);
    color: #64b5f6;
    padding: 0.6rem 1.15rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }

  .btn-open-settings:hover {
    background: rgba(33, 150, 243, 0.35);
    color: #fff;
  }
</style>
