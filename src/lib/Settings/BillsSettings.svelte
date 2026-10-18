<script lang="ts">
  import { lang, ripple, motion, dashboard } from "$lib/Stores";
  import Icon from "@iconify/svelte";
  import Ripple from "$lib/Actions/ripple";
  import { fade } from "svelte/transition";
  import {
    billsStore,
    fetchBills,
    saveBills,
    addBillType,
    updateBillType,
    deleteBillType,
    formatCurrency,
    type BillType,
    type BillsData,
  } from "$lib/Stores/bills";
  import { onMount } from "svelte";

  let loading = $state(false);
  let saving = $state(false);
  let saveSuccess = $state(false);
  let errorMessage = $state("");

  // Editing / creating bill type
  let showTypeModal = $state(false);
  let editingTypeId: string | null = $state(null);
  let typeName = $state("");
  let typeIcon = $state("mdi:receipt-text");
  let typeColor = $state("#2196F3");
  let typeProvider = $state("");
  let typeExpectedAmount = $state<number | undefined>(undefined);
  let typeDueDay = $state<number>(20);
  let typeNotes = $state("");
  let typeSubTypesText = $state("");
  let typeFixedAmount = $state(false);
  let typeAutoPay = $state(false);

  // Settings inputs
  let currency = $state("€");
  let paycheckDay = $state(15);
  let arrivalDay = $state(5);
  let aiProvider = $state<"gemini" | "openai">("gemini");
  let aiModel = $state("gemini-2.5-flash");
  let aiApiKey = $state("");
  let showApiKey = $state(false);

  // JSON Export/Import modal
  let showJsonModal = $state(false);
  let jsonText = $state("");

  const PRESET_ICONS = [
    "mdi:wifi",
    "mdi:lightning-bolt",
    "mdi:cellphone",
    "mdi:water",
    "mdi:fire",
    "mdi:home-city",
    "mdi:television-classic",
    "mdi:office-building",
    "mdi:car",
    "mdi:shield-check",
    "mdi:school",
    "mdi:credit-card-outline",
    "mdi:receipt-text",
    "mdi:currency-eur",
  ];

  const PRESET_COLORS = [
    "#2196F3",
    "#FFB300",
    "#AB47BC",
    "#26C6DA",
    "#FF7043",
    "#66BB6A",
    "#E91E63",
    "#7E57C2",
    "#26A69A",
    "#FFA726",
    "#8D6E63",
    "#78909C",
  ];

  onMount(async () => {
    loading = true;
    const data = await fetchBills(true);
    if (data?.settings) {
      currency = data.settings.currency || "€";
      paycheckDay = data.settings.paycheck_day ?? 15;
      arrivalDay = data.settings.bills_arrival_day ?? 5;
      aiProvider = data.settings.ai_provider || "gemini";
      aiModel = data.settings.ai_model || "gemini-2.5-flash";
      aiApiKey = data.settings.ai_api_key || "";
    }
    loading = false;
  });

  async function handleSaveSettings() {
    saving = true;
    saveSuccess = false;
    errorMessage = "";

    const updatedData: BillsData = {
      ...$billsStore,
      settings: {
        currency: currency.trim() || "€",
        paycheck_day: Number(paycheckDay) || 15,
        bills_arrival_day: Number(arrivalDay) || 5,
        ai_provider: aiProvider,
        ai_model: aiModel.trim() || "gemini-2.5-flash",
        ai_api_key: aiApiKey.trim(),
      },
    };

    const res = await saveBills(updatedData);
    saving = false;
    if (res.ok) {
      saveSuccess = true;
      setTimeout(() => {
        saveSuccess = false;
      }, 3000);
    } else {
      errorMessage = res.error || "Greška pri spremanju postavki.";
    }
  }

  function openCreateType() {
    editingTypeId = null;
    typeName = "";
    typeIcon = "mdi:receipt-text";
    typeColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    typeProvider = "";
    typeExpectedAmount = undefined;
    typeDueDay = 20;
    typeNotes = "";
    typeSubTypesText = "";
    typeFixedAmount = false;
    typeAutoPay = false;
    showTypeModal = true;
  }

  function openEditType(type: BillType) {
    editingTypeId = type.id;
    typeName = type.name;
    typeIcon = type.icon;
    typeColor = type.color;
    typeProvider = type.provider || "";
    typeExpectedAmount = type.expected_amount;
    typeDueDay = type.due_day || 20;
    typeNotes = type.notes || "";
    typeSubTypesText = (type.sub_types || []).join(", ");
    typeFixedAmount = Boolean(type.fixed_amount);
    typeAutoPay = Boolean(type.auto_pay);
    showTypeModal = true;
  }

  async function handleSaveType() {
    if (!typeName.trim()) {
      alert("Molimo unesite naziv vrste računa.");
      return;
    }

    const subTypesArray = typeSubTypesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingTypeId) {
      await updateBillType(editingTypeId, {
        name: typeName.trim(),
        icon: typeIcon.trim() || "mdi:receipt-text",
        color: typeColor,
        provider: typeProvider.trim() || undefined,
        expected_amount:
          typeExpectedAmount !== undefined && !isNaN(typeExpectedAmount)
            ? Number(typeExpectedAmount)
            : undefined,
        due_day: Number(typeDueDay) || 20,
        notes: typeNotes.trim() || undefined,
        sub_types: subTypesArray.length > 0 ? subTypesArray : undefined,
        fixed_amount: typeFixedAmount,
        auto_pay: typeAutoPay,
      });
    } else {
      const newId = `type_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await addBillType({
        id: newId,
        name: typeName.trim(),
        icon: typeIcon.trim() || "mdi:receipt-text",
        color: typeColor,
        provider: typeProvider.trim() || undefined,
        expected_amount:
          typeExpectedAmount !== undefined && !isNaN(typeExpectedAmount)
            ? Number(typeExpectedAmount)
            : undefined,
        due_day: Number(typeDueDay) || 20,
        notes: typeNotes.trim() || undefined,
        sub_types: subTypesArray.length > 0 ? subTypesArray : undefined,
        fixed_amount: typeFixedAmount,
        auto_pay: typeAutoPay,
      });
    }

    showTypeModal = false;
  }

  async function handleToggleFixedAmount(typeId: string, val: boolean) {
    await updateBillType(typeId, { fixed_amount: val });
  }

  async function handleDeleteType(typeId: string, typeName: string) {
    if (
      confirm(`Jeste li sigurni da želite obrisati vrstu računa "${typeName}"?`)
    ) {
      await deleteBillType(typeId);
    }
  }

  function addBillsDashboardToDashboard() {
    if (!$dashboard.views || $dashboard.views.length === 0) return;
    const currentView = $dashboard.views[0];
    if (!currentView.sections) currentView.sections = [];

    currentView.sections = [
      {
        id: Date.now() + Math.floor(Math.random() * 10000),
        type: "bills",
        name: "Kućni računi",
      },
      ...currentView.sections,
    ];

    dashboard.update((d) => JSON.parse(JSON.stringify(d)));
    alert(
      "Sekcija za račune uspješno je dodana na punu širinu vaše radne površine!",
    );
  }

  function openJsonModal() {
    jsonText = JSON.stringify($billsStore, null, 2);
    showJsonModal = true;
  }

  async function handleApplyJson() {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Nevažeći format JSON objekta");
      }
      await saveBills(parsed);
      showJsonModal = false;
      alert("Podaci o računima uspješno su uvezeni!");
    } catch (e: any) {
      alert("Greška u JSON podacima: " + (e?.message || "Neispravan JSON"));
    }
  }
</script>

<div class="bills-settings-root">
  <!-- TOP HEADER & CONTROLS -->
  <div class="header-card">
    <div class="header-main">
      <div class="header-titles">
        <h2>
          <Icon icon="mdi:receipt-text" class="header-icon" />
          {$lang("bills") || "Kućni računi"}
        </h2>
        <span class="subtitle">
          Upravljanje kućnim računima, vrstama troškova, praćenje plaćanja nakon
          plaće (15.) i uvoz računa
        </span>
      </div>

      <div class="header-actions">
        <button
          class="btn-action highlight"
          type="button"
          onclick={addBillsDashboardToDashboard}
          use:Ripple={$ripple}
        >
          <Icon icon="mdi:view-dashboard-plus" height="1.15rem" />
          <span>Dodaj na radnu površinu</span>
        </button>

        <button
          class="btn-action outline"
          type="button"
          onclick={openJsonModal}
          use:Ripple={$ripple}
        >
          <Icon icon="mdi:code-json" height="1.15rem" />
          <span>JSON Podaci</span>
        </button>
      </div>
    </div>

    {#if saveSuccess}
      <div class="banner success" transition:fade={{ duration: $motion }}>
        <Icon icon="mdi:check-circle" /> Postavke računa uspješno su spremljene!
      </div>
    {/if}

    {#if errorMessage}
      <div class="banner error" transition:fade={{ duration: $motion }}>
        <Icon icon="mdi:alert-circle" />
        {errorMessage}
      </div>
    {/if}
  </div>

  <!-- GENERAL SETTINGS: PAYCHECK & BILLS ARRIVAL -->
  <div class="settings-card">
    <div class="card-title-row">
      <Icon icon="mdi:cash-clock" class="section-icon" />
      <h3>Ciklus plaćanja i valuta</h3>
    </div>
    <p class="section-desc">
      Podesite kada u mjesecu stižu računi (npr. oko 5.), kada primate plaću
      (npr. 15.) i valutu prikaza.
    </p>

    <div class="grid-form">
      <div class="form-group">
        <label for="currency-input">Valuta</label>
        <input
          id="currency-input"
          type="text"
          bind:value={currency}
          placeholder="€"
          class="text-input"
        />
        <span class="hint">Simbol valute (npr. €, kn, $, CHF)</span>
      </div>

      <div class="form-group">
        <label for="paycheck-input">Dan primitka plaće (u mjesecu)</label>
        <input
          id="paycheck-input"
          type="number"
          min="1"
          max="31"
          bind:value={paycheckDay}
          class="text-input"
        />
        <span class="hint">Dan u mjesecu kada stiže plaća (npr. 15.)</span>
      </div>

      <div class="form-group">
        <label for="arrival-input">Očekivani dan prispijeća računa</label>
        <input
          id="arrival-input"
          type="number"
          min="1"
          max="31"
          bind:value={arrivalDay}
          class="text-input"
        />
        <span class="hint"
          >Okvirni dan kada računi stižu na email/poštu (npr. 5.)</span
        >
      </div>
    </div>

    <!-- AI SCANNING CONFIGURATION -->
    <div class="sub-section">
      <div class="card-title-row">
        <Icon icon="mdi:auto-fix" class="section-icon small" />
        <h4>Automatsko skeniranje računa (AI OCR)</h4>
      </div>
      <p class="section-desc">
        Sustav automatski čita iznose iz PDF-a. Opcionalno možete unijeti
        besplatni Gemini API ključ za precizno AI očitavanje računa s
        fotografija ili kompliciranih računa.
      </p>

      <div class="grid-form">
        <div class="form-group">
          <label for="ai-provider-select">AI Pružatelj</label>
          <select
            id="ai-provider-select"
            bind:value={aiProvider}
            class="text-input"
          >
            <option value="gemini"
              >Google Gemini (preporučeno - besplatno)</option
            >
            <option value="openai">OpenAI (GPT-4o)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="ai-model-input">Model</label>
          <input
            id="ai-model-input"
            type="text"
            bind:value={aiModel}
            placeholder={aiProvider === "gemini"
              ? "gemini-2.5-flash"
              : "gpt-4o"}
            class="text-input"
          />
        </div>

        <div class="form-group full-width">
          <label for="ai-key-input">API Ključ</label>
          <div class="input-with-button">
            <input
              id="ai-key-input"
              type={showApiKey ? "text" : "password"}
              bind:value={aiApiKey}
              placeholder="AI API Key (npr. AIzaSy...)"
              class="text-input"
            />
            <button
              type="button"
              class="toggle-pass-btn"
              onclick={() => (showApiKey = !showApiKey)}
            >
              <Icon icon={showApiKey ? "mdi:eye-off" : "mdi:eye"} />
            </button>
          </div>
          <span class="hint"
            >API ključ se sigurno koristi samo za OCR analizu vaših uplaćenih
            računa.</span
          >
        </div>
      </div>
    </div>

    <div class="card-footer-actions">
      <button
        type="button"
        class="btn-save"
        onclick={handleSaveSettings}
        disabled={saving}
        use:Ripple={$ripple}
      >
        <Icon icon="mdi:content-save" />
        <span>{saving ? "Spremanje..." : "Spremi postavke"}</span>
      </button>
    </div>
  </div>

  <!-- BILL TYPES MANAGEMENT -->
  <div class="settings-card">
    <div class="card-title-row space-between">
      <div class="left-title">
        <Icon icon="mdi:format-list-bulleted-type" class="section-icon" />
        <h3>Vrste kućnih računa</h3>
      </div>

      <button
        type="button"
        class="btn-action primary"
        onclick={openCreateType}
        use:Ripple={$ripple}
      >
        <Icon icon="mdi:plus" />
        <span>Nova vrsta računa</span>
      </button>
    </div>
    <p class="section-desc">
      Konfigurirajte vrste računa koje plaćate u kućanstvu (npr. Internet,
      Struja, Mobitel, Voda, Plin, Pričuva, Komunalno).
    </p>

    {#if ($billsStore.types || []).length === 0}
      <div class="empty-state">
        <Icon icon="mdi:receipt-text-outline" class="empty-icon" />
        <p>Nema konfiguriranih vrsta računa.</p>
        <button
          type="button"
          class="btn-action outline"
          onclick={openCreateType}
        >
          Dodaj prvu vrstu računa
        </button>
      </div>
    {:else}
      <div class="type-list">
        {#each $billsStore.types as type (type.id)}
          <div class="type-item">
            <div class="type-badge" style:background-color={type.color}>
              <Icon icon={type.icon || "mdi:receipt-text"} height="1.4rem" />
            </div>

            <div class="type-info">
              <div class="type-title-row">
                <span class="type-name">{type.name}</span>
                {#if type.provider}
                  <span class="type-provider">{type.provider}</span>
                {/if}
              </div>
              <div class="type-meta">
                {#if type.expected_amount}
                  <span class="meta-tag">
                    <Icon icon="mdi:cash" />
                    {type.fixed_amount ? "Iznos" : "Prosjek"}: {formatCurrency(
                      type.expected_amount,
                      currency,
                    )}
                  </span>
                {/if}
                {#if type.fixed_amount}
                  <span class="meta-tag fixed">
                    <Icon icon="mdi:lock-outline" /> Isti iznos svaki mjesec
                  </span>
                {/if}
                {#if type.auto_pay}
                  <span class="meta-tag autopay">
                    <Icon icon="mdi:autorenew" /> Automatsko plaćanje
                  </span>
                {/if}
                {#if type.due_day}
                  <span class="meta-tag">
                    <Icon icon="mdi:calendar-check" /> Dospijeće: oko {type.due_day}.
                    u mjesecu
                  </span>
                {/if}
                {#if type.notes}
                  <span class="meta-tag notes">
                    {type.notes}
                  </span>
                {/if}
                {#if type.sub_types && type.sub_types.length > 0}
                  <span class="meta-tag subtypes">
                    <Icon icon="mdi:format-list-checks" />
                    {type.sub_types.length} stavke: {type.sub_types.join(", ")}
                  </span>
                {/if}
              </div>
            </div>

            <div class="type-actions">
              <label
                class="type-fixed-toggle"
                title="Označi ako je iznos ovog računa isti svaki mjesec"
              >
                <input
                  type="checkbox"
                  checked={Boolean(type.fixed_amount)}
                  onchange={(e: any) =>
                    handleToggleFixedAmount(type.id, e.target.checked)}
                  class="checkbox-input-sm"
                />
                <span>Isti iznos svaki mjesec</span>
              </label>

              <button
                type="button"
                class="btn-icon-action"
                title="Uredi"
                onclick={() => openEditType(type)}
              >
                <Icon icon="mdi:pencil" />
              </button>
              <button
                type="button"
                class="btn-icon-action delete"
                title="Obriši"
                onclick={() => handleDeleteType(type.id, type.name)}
              >
                <Icon icon="mdi:trash-can-outline" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- MODAL: ADD / EDIT BILL TYPE -->
{#if showTypeModal}
  <div class="custom-modal-backdrop" transition:fade={{ duration: 150 }}>
    <div class="custom-modal-card">
      <div class="modal-header">
        <h3>{editingTypeId ? "Uredi vrstu računa" : "Nova vrsta računa"}</h3>
        <button
          type="button"
          class="modal-close-btn"
          onclick={() => (showTypeModal = false)}
        >
          <Icon icon="mdi:close" />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="type-name-input">Naziv vrste računa *</label>
          <input
            id="type-name-input"
            type="text"
            bind:value={typeName}
            placeholder="npr. Internet, Struja, Mobitel, Voda..."
            class="text-input"
          />
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label for="type-provider-input">Pružatelj / Izdavatelj</label>
            <input
              id="type-provider-input"
              type="text"
              bind:value={typeProvider}
              placeholder="npr. A1, HEP Elektra, HT, Vodovod..."
              class="text-input"
            />
          </div>

          <div class="form-group">
            <label for="type-amount-input"
              >{typeFixedAmount
                ? "Fiksni mjesečni iznos"
                : "Očekivani mjesečni iznos"} ({currency})</label
            >
            <input
              id="type-amount-input"
              type="number"
              step="0.01"
              bind:value={typeExpectedAmount}
              placeholder={typeFixedAmount ? "npr. 9.99" : "npr. 32.50"}
              class="text-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="type-due-input">Okvirni dan dospijeća u mjesecu</label>
          <input
            id="type-due-input"
            type="number"
            min="1"
            max="31"
            bind:value={typeDueDay}
            placeholder="20"
            class="text-input"
          />
          <span class="hint">Rok za plaćanje računa (npr. 20. u mjesecu)</span>
        </div>

        <!-- ICON SELECTION -->
        <div class="form-group">
          <label for="type-icon-input">Ikona</label>
          <div class="icon-selector-row">
            <input
              id="type-icon-input"
              type="text"
              bind:value={typeIcon}
              placeholder="mdi:wifi"
              class="text-input small"
            />
            <div class="icon-preview" style:color={typeColor}>
              <Icon icon={typeIcon || "mdi:receipt-text"} height="1.6rem" />
            </div>
          </div>
          <div class="icon-presets">
            {#each PRESET_ICONS as preset}
              <button
                type="button"
                class="preset-icon-btn"
                class:active={typeIcon === preset}
                onclick={() => (typeIcon = preset)}
              >
                <Icon icon={preset} height="1.1rem" />
              </button>
            {/each}
          </div>
        </div>

        <!-- COLOR SELECTION -->
        <div class="form-group">
          <label for="type-color-input">Boja kategorije</label>
          <div class="color-selector-row">
            <input
              id="type-color-input"
              type="color"
              bind:value={typeColor}
              class="color-picker-input"
            />
            <span class="color-hex">{typeColor}</span>
            <div class="color-presets">
              {#each PRESET_COLORS as color}
                <button
                  type="button"
                  class="preset-color-dot"
                  class:active={typeColor === color}
                  style:background-color={color}
                  onclick={() => (typeColor = color)}
                ></button>
              {/each}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="type-notes-input"
            >Napomena / Poziv na broj (opcionalno)</label
          >
          <input
            id="type-notes-input"
            type="text"
            bind:value={typeNotes}
            placeholder="npr. IBAN ili korisnički broj za plaćanje"
            class="text-input"
          />
        </div>

        <div class="form-group">
          <label for="type-subtypes-input"
            >Podvrste / Stavke paketa (odvojeno zarezom, npr. Osiguranje kuće,
            Vanjsko osiguranje, Dopunsko zdravstveno)</label
          >
          <input
            id="type-subtypes-input"
            type="text"
            bind:value={typeSubTypesText}
            placeholder="npr. Osiguranje kuće, Vanjsko osiguranje, Dopunsko zdravstveno"
            class="text-input"
          />
          <span class="hint"
            >Kada dodajete račun ovog pružatelja, ove stavke se mogu jednim
            klikom učitati kao podračuni.</span
          >
        </div>

        <!-- SAME AMOUNT (FIXED) & AUTO-PAY CHECKBOXES -->
        <div class="checkbox-options-card">
          <label class="custom-checkbox-row">
            <input
              type="checkbox"
              bind:checked={typeFixedAmount}
              class="checkbox-input"
            />
            <div class="checkbox-text-wrap">
              <span class="checkbox-title"
                >Isti iznos svaki mjesec (fiksni iznos)</span
              >
              <span class="checkbox-subtitle"
                >Ovaj račun ima isti iznos svaki mjesec (npr. Netflix,
                osiguranje, pretplata). Automatski će se postaviti gore navedeni
                iznos.</span
              >
            </div>
          </label>

          <label class="custom-checkbox-row">
            <input
              type="checkbox"
              bind:checked={typeAutoPay}
              class="checkbox-input"
            />
            <div class="checkbox-text-wrap">
              <span class="checkbox-title"
                >Automatsko plaćanje (trajni nalog / terećenje)</span
              >
              <span class="checkbox-subtitle"
                >Plaća se automatski s računa ili kartice — svaki mjesec se
                automatski dodaje i označava kao plaćen.</span
              >
            </div>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn-action outline"
          onclick={() => (showTypeModal = false)}
        >
          Odustani
        </button>
        <button
          type="button"
          class="btn-action primary"
          onclick={handleSaveType}
        >
          Spremi vrstu
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- MODAL: JSON BACKUP / RESTORE -->
{#if showJsonModal}
  <div class="custom-modal-backdrop" transition:fade={{ duration: 150 }}>
    <div class="custom-modal-card large">
      <div class="modal-header">
        <h3>Sigurnosna kopija i JSON uređivač</h3>
        <button
          type="button"
          class="modal-close-btn"
          onclick={() => (showJsonModal = false)}
        >
          <Icon icon="mdi:close" />
        </button>
      </div>

      <div class="modal-body">
        <p class="section-desc">
          Ovdje možete pregledati, kopirati ili ručno urediti cijelu bazu računa
          i postavki u JSON formatu.
        </p>
        <textarea bind:value={jsonText} rows="16" class="json-textarea"
        ></textarea>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn-action outline"
          onclick={() => (showJsonModal = false)}
        >
          Zatvori
        </button>
        <button
          type="button"
          class="btn-action primary"
          onclick={handleApplyJson}
        >
          Primijeni promjene
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .bills-settings-root {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.5rem 0 1.5rem 0;
    color: #e0e0e0;
    font-family: inherit;
  }

  .header-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.85rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .header-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .header-titles h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #fff;
  }

  :global(.header-icon) {
    color: #2196f3;
    font-size: 1.6rem;
  }

  .subtitle {
    font-size: 0.88rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .settings-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.85rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .card-title-row.space-between {
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .left-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .card-title-row h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    color: #fff;
  }

  .card-title-row h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: #fff;
  }

  :global(.section-icon) {
    color: #ffb300;
    font-size: 1.4rem;
  }

  :global(.section-icon.small) {
    font-size: 1.2rem;
    color: #ab47bc;
  }

  .section-desc {
    margin: -0.25rem 0 0.5rem 0;
    font-size: 0.86rem;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.4;
  }

  .grid-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-group label {
    font-size: 0.84rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
  }

  .hint {
    font-size: 0.76rem;
    color: rgba(255, 255, 255, 0.45);
  }

  .text-input {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.5rem;
    padding: 0.55rem 0.75rem;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
  }

  .text-input:focus {
    border-color: #2196f3;
  }

  .text-input.small {
    width: 140px;
  }

  .input-with-button {
    display: flex;
    align-items: center;
    position: relative;
  }

  .input-with-button .text-input {
    width: 100%;
    padding-right: 2.5rem;
  }

  .toggle-pass-btn {
    position: absolute;
    right: 0.5rem;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0.3rem;
  }

  .sub-section {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 1rem;
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .card-footer-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .btn-save {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    background: #ffb300;
    color: #261600;
    border: none;
    padding: 0.55rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    font-family: inherit;
  }

  .btn-save:hover {
    opacity: 0.9;
  }

  .btn-action {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.9rem;
    border-radius: 0.5rem;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-family: inherit;
  }

  .btn-action.primary {
    background: #2196f3;
    color: #fff;
  }

  .btn-action.highlight {
    background: rgba(33, 150, 243, 0.18);
    border: 1px solid rgba(33, 150, 243, 0.4);
    color: #64b5f6;
  }

  .btn-action.outline {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .btn-action:hover {
    filter: brightness(1.15);
  }

  .type-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .type-item {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 0.65rem;
    padding: 0.75rem 1rem;
    transition: background 0.2s;
  }

  .type-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .type-badge {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .type-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-width: 0;
  }

  .type-title-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .type-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: #fff;
  }

  .type-provider {
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.15rem 0.45rem;
    border-radius: 0.35rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .type-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .meta-tag {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .meta-tag.fixed {
    color: #64b5f6;
    background: rgba(33, 150, 243, 0.12);
    padding: 0.1rem 0.4rem;
    border-radius: 0.3rem;
  }

  .meta-tag.autopay {
    color: #81c784;
    background: rgba(76, 175, 80, 0.12);
    padding: 0.1rem 0.4rem;
    border-radius: 0.3rem;
  }

  .meta-tag.notes {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }

  .checkbox-options-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.6rem;
    padding: 0.85rem;
  }

  .custom-checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .checkbox-input {
    width: 1.15rem;
    height: 1.15rem;
    margin-top: 0.15rem;
    accent-color: #2196f3;
    cursor: pointer;
  }

  .checkbox-text-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .checkbox-title {
    font-size: 0.88rem;
    font-weight: 500;
    color: #fff;
  }

  .checkbox-subtitle {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.35;
  }

  .type-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .type-fixed-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.75);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.55rem;
    border-radius: 0.4rem;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s;
  }

  .type-fixed-toggle:hover {
    background: rgba(33, 150, 243, 0.15);
    border-color: rgba(33, 150, 243, 0.35);
    color: #90caf9;
  }

  .checkbox-input-sm {
    width: 0.95rem;
    height: 0.95rem;
    accent-color: #2196f3;
    cursor: pointer;
  }

  .btn-icon-action {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    width: 2rem;
    height: 2rem;
    border-radius: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.1rem;
  }

  .btn-icon-action:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .btn-icon-action.delete:hover {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2.5rem 1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
  }

  :global(.empty-icon) {
    font-size: 2.5rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .banner {
    padding: 0.65rem 0.9rem;
    border-radius: 0.5rem;
    font-size: 0.88rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .banner.success {
    background: rgba(76, 175, 80, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.35);
    color: #81c784;
  }

  .banner.error {
    background: rgba(244, 67, 54, 0.15);
    border: 1px solid rgba(244, 67, 54, 0.35);
    color: #e57373;
  }

  /* MODALS */
  .custom-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
  }

  .custom-modal-card {
    background: #1e1e24;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.9rem;
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    max-height: 90vh;
    overflow-y: auto;
  }

  .custom-modal-card.large {
    max-width: 700px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    color: #fff;
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .modal-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .form-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .icon-selector-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 0.4rem;
  }

  .icon-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.4rem;
  }

  .preset-icon-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.75);
    border-radius: 0.35rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .preset-icon-btn.active {
    background: rgba(33, 150, 243, 0.3);
    border-color: #2196f3;
    color: #fff;
  }

  .color-selector-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .color-picker-input {
    width: 2.5rem;
    height: 2.2rem;
    padding: 0;
    border: none;
    border-radius: 0.4rem;
    cursor: pointer;
    background: transparent;
  }

  .color-hex {
    font-family: monospace;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .color-presets {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .preset-color-dot {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s;
  }

  .preset-color-dot:hover {
    transform: scale(1.15);
  }

  .preset-color-dot.active {
    border-color: #fff;
    transform: scale(1.1);
  }

  .json-textarea {
    width: 100%;
    background: #141418;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.5rem;
    color: #e0e0e0;
    font-family: "Fira Code", monospace;
    font-size: 0.85rem;
    padding: 0.75rem;
    outline: none;
    resize: vertical;
  }
</style>
