<script lang="ts">
  import { editMode, itemHeight, lang, ripple, motion } from "$lib/Stores";
  import Icon from "@iconify/svelte";
  import { openModal } from "$lib/Modals";
  import Ripple from "$lib/Actions/ripple";
  import { fade } from "svelte/transition";
  import {
    billsStore,
    billsLoaded,
    fetchBills,
    toggleBillPaid,
    toggleSubBillPaid,
    deleteBill,
    getMonthStats,
    formatCurrency,
    formatDateHR,
    getCurrentMonthStr,
    getMonthLabel,
    ensureDefaultBillsForMonth,
    type BillEntry,
    type BillType,
    type SubBill,
  } from "$lib/Stores/bills";
  import { onMount } from "svelte";
  import BillFormModal from "$lib/Modal/BillFormModal.svelte";

  let {
    sel,
    sectionName = undefined,
  }: { sel: any; sectionName?: string | undefined } = $props();

  onMount(async () => {
    await fetchBills();
    if (selectedMonth) {
      await ensureDefaultBillsForMonth(selectedMonth);
    }
  });

  // Current viewed month (defaults to current YYYY-MM)
  let selectedMonth = $state(getCurrentMonthStr());
  let filterStatus = $state<"all" | "unpaid" | "paid">("all");
  let filterTypeId = $state<string | null>(null);

  // Automatically ensure default bills exist for the selected month
  $effect(() => {
    if ($billsLoaded && selectedMonth && ($billsStore.types || []).length > 0) {
      ensureDefaultBillsForMonth(selectedMonth);
    }
  });

  // Modals
  let showBillForm = $state(false);
  let activeBillToEdit = $state<BillEntry | undefined>(undefined);
  let previewFileUrl = $state<string | null>(null);
  let previewFileName = $state<string | null>(null);
  let previewFileType = $state<string | null>(null);

  // Sub-bills and grouping state
  let groupByProvider = $state(false);
  let expandedBillIds = $state<Record<string, boolean>>({});

  let currency = $derived($billsStore.settings?.currency || "€");
  let paycheckDay = $derived($billsStore.settings?.paycheck_day ?? 15);
  let arrivalDay = $derived($billsStore.settings?.bills_arrival_day ?? 5);

  let dismissedList = $derived(
    ($billsStore.dismissed_types &&
      $billsStore.dismissed_types[selectedMonth]) ||
      [],
  );

  let stats = $derived(
    getMonthStats(
      $billsStore.bills || [],
      selectedMonth,
      $billsStore.types || [],
      paycheckDay,
      arrivalDay,
      currency,
      dismissedList,
    ),
  );

  let filteredBills = $derived(
    stats.monthBills.filter((b) => {
      if (filterStatus === "unpaid" && b.paid) return false;
      if (filterStatus === "paid" && !b.paid) return false;
      if (filterTypeId && b.type_id !== filterTypeId) return false;
      return true;
    }),
  );

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, "0");
    selectedMonth = `${newY}-${newM}`;
    filterTypeId = null;
  }

  function resetToCurrentMonth() {
    selectedMonth = getCurrentMonthStr();
    filterTypeId = null;
  }

  function handleOpenAddBill(preferredTypeId?: string) {
    activeBillToEdit = preferredTypeId
      ? ({ type_id: preferredTypeId, month: selectedMonth } as any)
      : undefined;
    showBillForm = true;
  }

  function handleOpenEditBill(bill: BillEntry) {
    activeBillToEdit = bill;
    showBillForm = true;
  }

  async function handleTogglePaid(billId: string, event: MouseEvent) {
    event.stopPropagation();
    await toggleBillPaid(billId);
  }

  async function handleToggleSubBill(
    billId: string,
    subBillId: string,
    event: MouseEvent,
  ) {
    event.stopPropagation();
    await toggleSubBillPaid(billId, subBillId);
  }

  function toggleExpandBill(billId: string, event: MouseEvent) {
    event.stopPropagation();
    expandedBillIds = {
      ...expandedBillIds,
      [billId]: !(expandedBillIds[billId] ?? true),
    };
  }

  async function handleDelete(billId: string, event: MouseEvent) {
    event.stopPropagation();
    if (confirm("Jeste li sigurni da želite obrisati ovaj račun?")) {
      await deleteBill(billId);
    }
  }

  function handlePreviewFile(bill: BillEntry, event: MouseEvent) {
    event.stopPropagation();
    if (bill.file_url) {
      previewFileUrl = bill.file_url;
      previewFileName = bill.file_name || "Račun";
      previewFileType = bill.file_type || "application/pdf";
    }
  }

  function handleCardClick() {
    if ($editMode) {
      openModal(() => import("$lib/Modal/BillsConfig.svelte"), {
        sel,
        sectionName,
      });
    }
  }

  function openFullModal() {
    openModal(() => import("$lib/Modal/BillsModal.svelte"), {
      sel,
    });
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="bills-card-container"
  tabindex="-1"
  style:min-height="{$itemHeight}px"
  onclick={handleCardClick}
  onkeydown={(event) => {
    if (event.key === "Enter") handleCardClick();
  }}
  role="region"
  aria-label="Kućni računi"
>
  <!-- TOP DASHBOARD HEADER -->
  <div class="dashboard-header">
    <div class="header-left">
      <div class="widget-icon">
        <Icon icon="mdi:receipt-text" height="1.15rem" />
      </div>
      <div class="widget-title-group">
        <span class="widget-title"
          >{sel?.name || $lang("bills") || "Kućni računi"}</span
        >
        <span class="month-label">{getMonthLabel(selectedMonth)}</span>
      </div>
    </div>

    <!-- MONTH PICKER & FULLSCREEN ACTION -->
    <div class="header-right" onclick={(e) => e.stopPropagation()}>
      <div class="month-stepper">
        <button
          type="button"
          class="month-nav-btn"
          title="Prethodni mjesec"
          onclick={() => changeMonth(-1)}
        >
          <Icon icon="mdi:chevron-left" />
        </button>

        {#if selectedMonth !== getCurrentMonthStr()}
          <button
            type="button"
            class="month-today-btn"
            title="Vrati na tekući mjesec"
            onclick={resetToCurrentMonth}
          >
            Danas
          </button>
        {/if}

        <button
          type="button"
          class="month-nav-btn"
          title="Sljedeći mjesec"
          onclick={() => changeMonth(1)}
        >
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>

      <button
        type="button"
        class="expand-btn"
        title="Otvori detaljni prozor"
        onclick={openFullModal}
      >
        <Icon icon="mdi:fullscreen" />
      </button>
    </div>
  </div>

  <!-- FINANCIAL SUMMARY METRICS -->
  <div class="metrics-grid">
    <!-- LEFT TO PAY (UNPAID) -->
    <div class="metric-card unpaid" class:has-unpaid={stats.unpaidAmount > 0}>
      <div class="metric-icon-wrap">
        <Icon icon="mdi:alert-circle-outline" />
      </div>
      <div class="metric-content">
        <span class="metric-label">Preostalo za platiti</span>
        <span class="metric-value"
          >{formatCurrency(stats.unpaidAmount, currency)}</span
        >
        <span class="metric-sub"
          >{stats.unpaidCount}
          {stats.unpaidCount === 1 ? "račun" : "računa"}</span
        >
      </div>
    </div>

    <!-- PAID THIS MONTH -->
    <div class="metric-card paid">
      <div class="metric-icon-wrap">
        <Icon icon="mdi:check-circle-outline" />
      </div>
      <div class="metric-content">
        <span class="metric-label">Plaćeno ovaj mjesec</span>
        <span class="metric-value"
          >{formatCurrency(stats.paidAmount, currency)}</span
        >
        <span class="metric-sub"
          >{stats.paidCount} {stats.paidCount === 1 ? "račun" : "računa"}</span
        >
      </div>
    </div>

    <!-- TOTAL FOR MONTH -->
    <div class="metric-card total">
      <div class="metric-icon-wrap">
        <Icon icon="mdi:calculator-variant-outline" />
      </div>
      <div class="metric-content">
        <span class="metric-label">Ukupno zaduženje</span>
        <span class="metric-value"
          >{formatCurrency(stats.totalAmount, currency)}</span
        >
        <span class="metric-sub">{stats.percentPaid}% plaćeno</span>
      </div>
    </div>
  </div>

  <!-- PROGRESS BAR -->
  <div class="progress-bar-track" title="{stats.percentPaid}% plaćeno">
    <div class="progress-bar-fill" style:width="{stats.percentPaid}%"></div>
  </div>

  <!-- QUICK ACTIONS & FILTER ROW -->
  <div class="actions-and-filters-row" onclick={(e) => e.stopPropagation()}>
    <div class="action-buttons">
      <button
        type="button"
        class="btn-quick upload"
        onclick={() => handleOpenAddBill()}
        use:Ripple={$ripple}
      >
        <Icon icon="mdi:cloud-upload" />
        <span>Učitaj račun</span>
      </button>

      <button
        type="button"
        class="btn-quick outline"
        onclick={() => handleOpenAddBill()}
        use:Ripple={$ripple}
      >
        <Icon icon="mdi:plus" />
        <span>Ručni unos</span>
      </button>
    </div>

    <div class="filter-controls-right">
      <div class="filter-chips">
        <button
          type="button"
          class="filter-chip"
          class:active={filterStatus === "all"}
          onclick={() => (filterStatus = "all")}
        >
          Svi ({stats.totalCount})
        </button>
        <button
          type="button"
          class="filter-chip unpaid"
          class:active={filterStatus === "unpaid"}
          onclick={() => (filterStatus = "unpaid")}
        >
          Neplaćeni ({stats.unpaidCount})
        </button>
        <button
          type="button"
          class="filter-chip paid"
          class:active={filterStatus === "paid"}
          onclick={() => (filterStatus = "paid")}
        >
          Plaćeni ({stats.paidCount})
        </button>
      </div>

      <div class="view-mode-toggles">
        <button
          type="button"
          class="view-mode-btn"
          class:active={!groupByProvider}
          onclick={() => (groupByProvider = false)}
          title="Prikaži račune kronološki"
        >
          <Icon icon="mdi:format-list-bulleted" />
          <span>Svi</span>
        </button>
        <button
          type="button"
          class="view-mode-btn"
          class:active={groupByProvider}
          onclick={() => (groupByProvider = true)}
          title="Grupiraj račune po pružatelju (npr. Uniqa, A1, HEP)"
        >
          <Icon icon="mdi:domain" />
          <span>Po pružatelju</span>
        </button>
      </div>
    </div>
  </div>

  <!-- OVERVIEW PER BILL TYPE CHIPS -->
  {#if sel?.show_breakdown !== false && stats.byType.length > 0}
    <div class="type-overview-container" onclick={(e) => e.stopPropagation()}>
      <div class="type-overview-header">
        <span class="type-overview-title">Pregled po vrstama troškova</span>
        {#if filterTypeId}
          <button
            type="button"
            class="clear-filter-btn"
            onclick={() => (filterTypeId = null)}
          >
            Prikaži sve vrste
          </button>
        {/if}
      </div>

      <div class="type-chips-scroll">
        {#each stats.byType as item (item.type.id)}
          <button
            type="button"
            class="type-chip-card"
            class:active={filterTypeId === item.type.id}
            class:has-unpaid={item.unpaid > 0}
            class:is-paid={item.hasBill && item.allPaid}
            class:missing={!item.hasBill}
            onclick={() => {
              filterTypeId =
                filterTypeId === item.type.id ? null : item.type.id;
            }}
          >
            <div
              class="type-chip-badge"
              style:background-color={item.type.color}
            >
              <Icon
                icon={item.type.icon || "mdi:receipt-text"}
                height="1.1rem"
              />
            </div>

            <div class="type-chip-texts">
              <span class="type-chip-name">{item.type.name}</span>
              {#if item.hasBill}
                {#if item.unpaid > 0}
                  <span class="type-chip-amt unpaid">
                    Za platiti: {formatCurrency(item.unpaid, currency)}
                  </span>
                {:else if item.paid > 0}
                  <span class="type-chip-amt paid">
                    Plaćeno: {formatCurrency(item.paid, currency)}
                  </span>
                {:else if item.type.fixed_amount && item.type.expected_amount}
                  <span class="type-chip-amt fixed">
                    Iznos: {formatCurrency(item.type.expected_amount, currency)}
                  </span>
                {:else}
                  <span class="type-chip-amt missing">Nije prispio</span>
                {/if}
              {:else if item.type.fixed_amount && item.type.expected_amount}
                <span class="type-chip-amt fixed">
                  Iznos: {formatCurrency(item.type.expected_amount, currency)}
                </span>
              {:else}
                <span class="type-chip-amt missing">Nije prispio</span>
              {/if}
            </div>

            {#if !item.hasBill}
              <div
                class="quick-add-type-btn"
                title="Učitaj račun za {item.type.name}"
                onclick={(e) => {
                  e.stopPropagation();
                  handleOpenAddBill(item.type.id);
                }}
              >
                <Icon icon="mdi:plus-circle" />
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- BILLS LIST FOR CURRENT MONTH -->
  <div class="bills-list-section" onclick={(e) => e.stopPropagation()}>
    <div class="bills-list-header">
      <span class="list-title">
        Popis računa za {getMonthLabel(selectedMonth)}
        {#if filteredBills.length > 0}
          <span class="count-badge">({filteredBills.length})</span>
        {/if}
      </span>
    </div>

    {#if filteredBills.length === 0}
      <div class="empty-bills-box">
        <Icon icon="mdi:invoice-text-outline" class="empty-bills-icon" />
        <span class="empty-bills-text">
          {filterStatus === "unpaid"
            ? "Nema neplaćenih računa za ovaj mjesec! Sve je podmireno."
            : filterStatus === "paid"
              ? "Još nema označenih plaćenih računa za ovaj mjesec."
              : "Nema dodanih računa za ovaj mjesec. Učitajte PDF račun ili unesite podatke ručno."}
        </span>
        <button
          type="button"
          class="btn-empty-upload"
          onclick={() => handleOpenAddBill()}
        >
          <Icon icon="mdi:cloud-upload" />
          <span>Učitaj račun za {getMonthLabel(selectedMonth)}</span>
        </button>
      </div>
    {:else if groupByProvider}
      <!-- GROUPED BY PROVIDER VIEW -->
      <div class="provider-groups-container">
        {#each stats.byProvider as group (group.provider)}
          {@const groupBills = group.bills.filter((b) => {
            if (filterStatus === "unpaid" && b.paid) return false;
            if (filterStatus === "paid" && !b.paid) return false;
            if (filterTypeId && b.type_id !== filterTypeId) return false;
            return true;
          })}
          {#if groupBills.length > 0}
            <div class="provider-group-card">
              <div class="provider-group-header">
                <div class="provider-group-left">
                  <div class="provider-icon-badge">
                    <Icon icon="mdi:domain" />
                  </div>
                  <div class="provider-titles">
                    <span class="provider-name">{group.provider}</span>
                    <span class="provider-count">
                      {groupBills.length}
                      {groupBills.length === 1 ? "račun" : "računa"}
                    </span>
                  </div>
                </div>

                <div class="provider-group-totals">
                  {#if group.unpaid > 0}
                    <span class="provider-total unpaid">
                      Za platiti: {formatCurrency(group.unpaid, currency)}
                    </span>
                  {/if}
                  {#if group.paid > 0}
                    <span class="provider-total paid">
                      Plaćeno: {formatCurrency(group.paid, currency)}
                    </span>
                  {/if}
                </div>
              </div>

              <div class="bills-list in-group">
                {#each groupBills as bill (bill.id)}
                  {@render renderBillRow(bill)}
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <!-- CHRONOLOGICAL BILLS LIST -->
      <div class="bills-list">
        {#each filteredBills as bill (bill.id)}
          {@render renderBillRow(bill)}
        {/each}
      </div>
    {/if}
  </div>
</div>

{#snippet renderBillRow(bill: BillEntry)}
  {@const billType = $billsStore.types.find((t) => t.id === bill.type_id)}
  {@const isExpanded = expandedBillIds[bill.id] ?? true}
  {@const isAutoPay = Boolean(bill.auto_pay ?? billType?.auto_pay)}
  {@const isFixed = Boolean(bill.fixed_amount ?? billType?.fixed_amount)}
  <div class="bill-row-wrapper">
    <div class="bill-row" class:is-paid={bill.paid}>
      <!-- TYPE ICON -->
      <div
        class="bill-type-icon"
        style:background-color={billType?.color || "#2196f3"}
      >
        <Icon icon={billType?.icon || "mdi:receipt-text"} height="1.15rem" />
      </div>

      <!-- BILL DETAILS -->
      <div class="bill-info">
        <div class="bill-title-row">
          <span class="bill-title"
            >{bill.title || billType?.name || "Račun"}</span
          >
          {#if bill.provider || billType?.provider}
            <span class="bill-provider-tag"
              >{bill.provider || billType?.provider}</span
            >
          {/if}
          {#if isAutoPay}
            <span
              class="bill-badge autopay"
              title="Automatsko plaćanje (trajni nalog / tereti se automatski)"
            >
              <Icon icon="mdi:autorenew" />
              <span>Automatsko</span>
            </span>
          {/if}
          {#if isFixed}
            <span
              class="bill-badge fixed"
              title="Isti iznos svaki mjesec (fiksni iznos)"
            >
              <Icon icon="mdi:lock-outline" />
              <span>Fiksno</span>
            </span>
          {/if}
          {#if bill.sub_bills && bill.sub_bills.length > 0}
            <button
              type="button"
              class="sub-bills-count-badge"
              onclick={(e) => toggleExpandBill(bill.id, e)}
              title="Prikaži/sakrij pojedinačne stavke"
            >
              <Icon icon="mdi:format-list-checks" />
              <span>
                {bill.sub_bills.filter((s) => s.paid).length}/{bill.sub_bills
                  .length} stavki
              </span>
              <Icon icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} />
            </button>
          {/if}
          {#if bill.file_url}
            <button
              type="button"
              class="attachment-pill"
              title="Pregledaj račun ({bill.file_name})"
              onclick={(e) => handlePreviewFile(bill, e)}
            >
              <Icon icon="mdi:file-document-outline" />
              <span>Dokument</span>
            </button>
          {:else}
            <button
              type="button"
              class="attachment-pill empty"
              title="Priloži račun (PDF/slika)"
              onclick={(e) => {
                e.stopPropagation();
                handleOpenEditBill(bill);
              }}
            >
              <Icon icon="mdi:paperclip" />
              <span>Priloži PDF</span>
            </button>
          {/if}
        </div>

        <div class="bill-dates-row">
          {#if bill.due_date}
            <span class="date-chip" class:overdue={!bill.paid}>
              <Icon icon="mdi:calendar-alert" />
              Dospijeće: {formatDateHR(bill.due_date)}
            </span>
          {/if}
          {#if bill.paid && bill.paid_date}
            <span class="date-chip paid">
              <Icon icon="mdi:check-circle" />
              Plaćeno: {formatDateHR(bill.paid_date)}
            </span>
          {/if}
          {#if bill.notes}
            <span class="bill-notes-text">
              {bill.notes}
            </span>
          {/if}
        </div>
      </div>

      <!-- BILL AMOUNT -->
      <div class="bill-amount-wrap">
        <button
          type="button"
          class="bill-amount-btn"
          title="Kliknite za izmjenu iznosa"
          onclick={(e) => {
            e.stopPropagation();
            handleOpenEditBill(bill);
          }}
        >
          <span class="bill-amount-text" class:paid={bill.paid}>
            {formatCurrency(bill.amount, bill.currency || currency)}
          </span>
          <Icon icon="mdi:pencil-outline" class="amount-edit-icon" />
        </button>
        {#if (!bill.amount || bill.amount === 0) && !bill.paid}
          <span class="amount-zero-hint">Unesite iznos</span>
        {/if}
      </div>

      <!-- ONE-CLICK PAID TOGGLE BUTTON -->
      <div class="bill-actions">
        <button
          type="button"
          class="btn-pay-toggle"
          class:paid={bill.paid}
          title={bill.paid
            ? "Kliknite za poništenje plaćanja (sve stavke)"
            : "Kliknite za označiti račun i sve stavke kao plaćene"}
          onclick={(e) => handleTogglePaid(bill.id, e)}
          use:Ripple={$ripple}
        >
          {#if bill.paid}
            <Icon icon="mdi:check" />
            <span>Plaćeno</span>
          {:else}
            <Icon icon="mdi:credit-card-outline" />
            <span>Plati</span>
          {/if}
        </button>

        <!-- EDIT / DELETE BUTTONS -->
        <button
          type="button"
          class="btn-row-action"
          title="Uredi račun"
          onclick={() => handleOpenEditBill(bill)}
        >
          <Icon icon="mdi:pencil" />
        </button>

        <button
          type="button"
          class="btn-row-action delete"
          title="Obriši račun"
          onclick={(e) => handleDelete(bill.id, e)}
        >
          <Icon icon="mdi:trash-can-outline" />
        </button>
      </div>
    </div>

    <!-- EXPANDABLE SUB-BILLS TRAY -->
    {#if bill.sub_bills && bill.sub_bills.length > 0 && isExpanded}
      <div class="sub-bills-tray" transition:fade={{ duration: 120 }}>
        <div class="sub-tray-header">
          <Icon icon="mdi:subdirectory-arrow-right" class="sub-arrow" />
          <span class="sub-tray-title">Pojedinačni podračuni i stavke:</span>
        </div>
        <div class="sub-tray-items">
          {#each bill.sub_bills as sub (sub.id)}
            <div class="sub-tray-item" class:is-paid={sub.paid}>
              <div class="sub-tray-left">
                <Icon
                  icon={sub.paid ? "mdi:check-circle" : "mdi:circle-outline"}
                  class="sub-status-bullet"
                />
                <span class="sub-tray-name">{sub.title}</span>
              </div>

              <div class="sub-tray-right">
                <span class="sub-tray-amt" class:is-paid={sub.paid}>
                  {formatCurrency(sub.amount, bill.currency || currency)}
                </span>
                <button
                  type="button"
                  class="btn-sub-pay"
                  class:paid={sub.paid}
                  title={sub.paid
                    ? "Poništi plaćanje ove stavke"
                    : "Označi stavku kao plaćenu"}
                  onclick={(e) => handleToggleSubBill(bill.id, sub.id, e)}
                >
                  {#if sub.paid}
                    <Icon icon="mdi:check" />
                    <span>Plaćeno</span>
                  {:else}
                    <Icon icon="mdi:credit-card-outline" />
                    <span>Plati</span>
                  {/if}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/snippet}

<!-- BILL ADD/EDIT MODAL -->
{#if showBillForm}
  <BillFormModal
    isOpen={showBillForm}
    bill={activeBillToEdit}
    defaultMonth={selectedMonth}
    onClose={() => {
      showBillForm = false;
      activeBillToEdit = undefined;
    }}
  />
{/if}

<!-- BILL FILE PREVIEW MODAL -->
{#if previewFileUrl}
  <div
    class="preview-backdrop"
    transition:fade={{ duration: 150 }}
    onclick={() => (previewFileUrl = null)}
  >
    <div class="preview-card" onclick={(e) => e.stopPropagation()}>
      <div class="preview-header">
        <div class="preview-title">
          <Icon
            icon={previewFileType?.includes("pdf")
              ? "mdi:file-pdf-box"
              : "mdi:file-image"}
          />
          <span>{previewFileName}</span>
        </div>
        <div class="preview-actions">
          <a
            href={previewFileUrl}
            download={previewFileName || "racun"}
            class="preview-link-btn"
            title="Preuzmi datoteku"
          >
            <Icon icon="mdi:download" />
          </a>
          <button
            type="button"
            class="preview-close-btn"
            onclick={() => (previewFileUrl = null)}
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
      </div>

      <div class="preview-content">
        {#if previewFileType?.includes("pdf")}
          <iframe
            src={previewFileUrl}
            title="Pregled računa"
            class="preview-iframe"
          ></iframe>
        {:else}
          <img src={previewFileUrl} alt="Pregled računa" class="preview-img" />
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .bills-card-container {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    background: var(--ha-card-background, rgba(255, 255, 255, 0.04));
    border: 1px solid var(--ha-card-border-color, rgba(255, 255, 255, 0.08));
    border-radius: var(--ha-card-border-radius, 0.85rem);
    padding: 0.75rem 0.85rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    color: #e0e0e0;
    font-family: inherit;
    position: relative;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    overflow-x: hidden;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
    min-width: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
  }

  .widget-icon {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.55rem;
    background: linear-gradient(135deg, #1976d2, #2196f3);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 10px rgba(33, 150, 243, 0.35);
    flex-shrink: 0;
  }

  .widget-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    min-width: 0;
  }

  .widget-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .month-label {
    font-size: 0.76rem;
    color: rgba(255, 255, 255, 0.65);
    font-weight: 500;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .month-stepper {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.45rem;
    padding: 0.12rem;
  }

  .month-nav-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.75);
    width: 1.65rem;
    height: 1.65rem;
    border-radius: 0.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .month-nav-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .month-today-btn {
    background: rgba(33, 150, 243, 0.25);
    border: none;
    color: #64b5f6;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-family: inherit;
  }

  .expand-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 0.45rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .expand-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  /* METRICS GRID: Exactly 3 responsive columns */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
    min-width: 0;
  }

  .metric-card {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 0.6rem;
    padding: 0.5rem 0.65rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    transition:
      transform 0.2s,
      border-color 0.2s;
  }

  .metric-card.unpaid.has-unpaid {
    border-color: rgba(255, 179, 0, 0.35);
    background: rgba(255, 179, 0, 0.06);
  }

  .metric-icon-wrap {
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 0.45rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
  }

  .metric-card.unpaid .metric-icon-wrap {
    background: rgba(255, 179, 0, 0.15);
    color: #ffb300;
  }

  .metric-card.paid .metric-icon-wrap {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
  }

  .metric-card.total .metric-icon-wrap {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .metric-content {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    min-width: 0;
    overflow: hidden;
  }

  .metric-label {
    font-size: 0.65rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .metric-value {
    font-size: 1.12rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .metric-card.unpaid.has-unpaid .metric-value {
    color: #ffca28;
  }

  .metric-card.paid .metric-value {
    color: #81c784;
  }

  .metric-sub {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.45);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* PROGRESS BAR */
  .progress-bar-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
    min-width: 0;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffb300, #4caf50);
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  /* ACTIONS & FILTERS */
  .actions-and-filters-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    flex-wrap: wrap;
    min-width: 0;
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .btn-quick {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.32rem 0.65rem;
    border-radius: 0.45rem;
    font-size: 0.78rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-quick.upload {
    background: #2196f3;
    color: #fff;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
  }

  .btn-quick.outline {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .btn-quick:hover {
    filter: brightness(1.15);
  }

  .filter-controls-right {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .filter-chips {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    background: rgba(0, 0, 0, 0.25);
    padding: 0.12rem;
    border-radius: 0.45rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .filter-chip {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    padding: 0.22rem 0.48rem;
    border-radius: 0.3rem;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .filter-chip.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .filter-chip.unpaid.active {
    background: rgba(255, 179, 0, 0.25);
    color: #ffe082;
  }

  .filter-chip.paid.active {
    background: rgba(76, 175, 80, 0.25);
    color: #a5d6a7;
  }

  .view-mode-toggles {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    background: rgba(0, 0, 0, 0.25);
    padding: 0.12rem;
    border-radius: 0.45rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .view-mode-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    padding: 0.22rem 0.45rem;
    border-radius: 0.3rem;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .view-mode-btn.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  /* TYPE BREAKDOWN CHIPS */
  .type-overview-container {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding-top: 0.1rem;
    min-width: 0;
    max-width: 100%;
  }

  .type-overview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  .type-overview-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.65);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .clear-filter-btn {
    background: transparent;
    border: none;
    color: #64b5f6;
    font-size: 0.72rem;
    cursor: pointer;
    font-weight: 500;
  }

  .type-chips-scroll {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    min-width: 0;
    max-width: 100%;
  }

  .type-chips-scroll::-webkit-scrollbar {
    height: 3px;
  }

  .type-chips-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .type-chip-card {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.55rem;
    padding: 0.32rem 0.55rem;
    cursor: pointer;
    color: inherit;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.2s;
    font-family: inherit;
  }

  .type-chip-card:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .type-chip-card.active {
    border-color: #2196f3;
    background: rgba(33, 150, 243, 0.12);
  }

  .type-chip-card.has-unpaid {
    border-color: rgba(255, 179, 0, 0.35);
  }

  .type-chip-card.is-paid {
    border-color: rgba(76, 175, 80, 0.3);
  }

  .type-chip-badge {
    width: 1.55rem;
    height: 1.55rem;
    border-radius: 0.35rem;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .type-chip-texts {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    text-align: left;
  }

  .type-chip-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
  }

  .type-chip-amt {
    font-size: 0.68rem;
  }

  .type-chip-amt.unpaid {
    color: #ffca28;
    font-weight: 600;
  }

  .type-chip-amt.paid {
    color: #81c784;
  }

  .type-chip-amt.fixed {
    color: #64b5f6;
  }

  .type-chip-amt.missing {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }

  .quick-add-type-btn {
    color: rgba(255, 255, 255, 0.4);
    display: flex;
    font-size: 0.95rem;
    margin-left: 0.15rem;
    cursor: pointer;
  }

  .quick-add-type-btn:hover {
    color: #64b5f6;
  }

  /* BILLS LIST SECTION */
  .bills-list-section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .bills-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  .list-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .count-badge {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.74rem;
  }

  .empty-bills-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem 1rem;
    background: rgba(0, 0, 0, 0.18);
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 0.65rem;
    text-align: center;
  }

  :global(.empty-bills-icon) {
    font-size: 2.2rem;
    color: rgba(255, 255, 255, 0.25);
  }

  .empty-bills-text {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    max-width: 360px;
    line-height: 1.35;
  }

  .btn-empty-upload {
    background: #2196f3;
    border: none;
    color: #fff;
    padding: 0.4rem 0.85rem;
    border-radius: 0.45rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-family: inherit;
    margin-top: 0.3rem;
  }

  /* Scrollable Bills List Container to fit tablet screens cleanly */
  .bills-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    overflow-y: auto;
    max-height: clamp(200px, 46vh, 480px);
    padding-right: 0.25rem;
    min-width: 0;
  }

  .bills-list::-webkit-scrollbar {
    width: 4px;
  }

  .bills-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .bills-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  /* BILL ROW WRAPPER & BILL ROW */
  .bill-row-wrapper {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.65rem;
    overflow: hidden;
    transition: all 0.2s;
    min-width: 0;
  }

  .bill-row-wrapper:hover {
    border-color: rgba(255, 255, 255, 0.14);
  }

  .bill-row-wrapper .bill-row {
    background: transparent;
    border: none;
    border-radius: 0;
  }

  .bill-row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.65rem;
    padding: 0.45rem 0.65rem;
    transition: all 0.2s;
    min-width: 0;
  }

  .bill-row:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .bill-row.is-paid {
    border-color: rgba(76, 175, 80, 0.25);
    background: rgba(76, 175, 80, 0.04);
  }

  .bill-type-icon {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.45rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }

  .bill-info {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .bill-title-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    min-width: 0;
  }

  .bill-title {
    font-weight: 600;
    font-size: 0.88rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bill-provider-tag {
    font-size: 0.68rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.08rem 0.35rem;
    border-radius: 0.25rem;
    color: rgba(255, 255, 255, 0.8);
    white-space: nowrap;
  }

  .attachment-pill {
    background: rgba(33, 150, 243, 0.15);
    border: 1px solid rgba(33, 150, 243, 0.3);
    color: #64b5f6;
    padding: 0.08rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
  }

  .attachment-pill:hover {
    background: rgba(33, 150, 243, 0.3);
  }

  .attachment-pill.empty {
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.65);
  }

  .attachment-pill.empty:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.45);
  }

  .bill-badge {
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.08rem 0.35rem;
    border-radius: 0.25rem;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
  }

  .bill-badge.autopay {
    background: rgba(76, 175, 80, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.35);
    color: #81c784;
  }

  .bill-badge.fixed {
    background: rgba(33, 150, 243, 0.15);
    border: 1px solid rgba(33, 150, 243, 0.3);
    color: #64b5f6;
  }

  .sub-bills-count-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(33, 150, 243, 0.15);
    border: 1px solid rgba(33, 150, 243, 0.3);
    color: #90caf9;
    padding: 0.08rem 0.45rem;
    border-radius: 1rem;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .sub-bills-count-badge:hover {
    background: rgba(33, 150, 243, 0.25);
  }

  .bill-dates-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    min-width: 0;
  }

  .date-chip {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
  }

  .date-chip.overdue {
    color: #ffe082;
  }

  .date-chip.paid {
    color: #81c784;
  }

  .bill-notes-text {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bill-amount-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 0 0.35rem;
    flex-shrink: 0;
  }

  .bill-amount-text {
    font-size: 1.05rem;
    font-weight: 700;
    color: #ffca28;
    letter-spacing: -0.2px;
    white-space: nowrap;
  }

  .bill-amount-text.paid {
    color: #81c784;
  }

  .bill-amount-btn {
    background: transparent;
    border: none;
    padding: 0.1rem 0.25rem;
    border-radius: 0.35rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .bill-amount-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  :global(.amount-edit-icon) {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .bill-amount-btn:hover :global(.amount-edit-icon) {
    opacity: 1;
    color: #ffca28;
  }

  .amount-zero-hint {
    font-size: 0.65rem;
    color: #ffb300;
    font-weight: 500;
    white-space: nowrap;
  }

  .bill-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-pay-toggle {
    background: rgba(255, 179, 0, 0.18);
    border: 1px solid rgba(255, 179, 0, 0.4);
    color: #ffb300;
    padding: 0.3rem 0.65rem;
    border-radius: 0.45rem;
    font-size: 0.76rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: inherit;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .btn-pay-toggle:hover {
    background: rgba(255, 179, 0, 0.3);
    transform: scale(1.02);
  }

  .btn-pay-toggle.paid {
    background: rgba(76, 175, 80, 0.18);
    border-color: rgba(76, 175, 80, 0.4);
    color: #81c784;
  }

  .btn-pay-toggle.paid:hover {
    background: rgba(76, 175, 80, 0.3);
  }

  .btn-row-action {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.55);
    width: 1.65rem;
    height: 1.65rem;
    border-radius: 0.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .btn-row-action:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .btn-row-action.delete:hover {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }

  /* SUB-BILLS TRAY */
  .sub-bills-tray {
    background: rgba(0, 0, 0, 0.35);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.45rem 0.75rem 0.55rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .sub-tray-header {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  :global(.sub-arrow) {
    font-size: 0.85rem;
    color: #42a5f5;
  }

  .sub-tray-items {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .sub-tray-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.3rem 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 0.4rem;
    transition: all 0.15s;
    min-width: 0;
  }

  .sub-tray-item.is-paid {
    background: rgba(76, 175, 80, 0.05);
    border-color: rgba(76, 175, 80, 0.15);
  }

  .sub-tray-left {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: #e0e0e0;
    min-width: 0;
    overflow: hidden;
  }

  :global(.sub-status-bullet) {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
  }

  .sub-tray-item.is-paid :global(.sub-status-bullet) {
    color: #4caf50;
  }

  .sub-tray-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub-tray-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .sub-tray-amt {
    font-size: 0.82rem;
    font-weight: 600;
    color: #ffca28;
    white-space: nowrap;
  }

  .sub-tray-amt.is-paid {
    color: rgba(255, 255, 255, 0.6);
  }

  .btn-sub-pay {
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.35);
    color: #90caf9;
    padding: 0.15rem 0.45rem;
    border-radius: 0.8rem;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .btn-sub-pay:hover {
    background: rgba(33, 150, 243, 0.35);
  }

  .btn-sub-pay.paid {
    background: rgba(76, 175, 80, 0.2);
    border-color: rgba(76, 175, 80, 0.35);
    color: #a5d6a7;
  }

  /* PROVIDER GROUPS */
  .provider-groups-container {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    overflow-y: auto;
    max-height: clamp(200px, 46vh, 480px);
    padding-right: 0.25rem;
    min-width: 0;
  }

  .provider-groups-container::-webkit-scrollbar {
    width: 4px;
  }

  .provider-groups-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .provider-group-card {
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.65rem;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }

  .provider-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.1rem 0.25rem 0.35rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    min-width: 0;
  }

  .provider-group-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .provider-icon-badge {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.4rem;
    background: rgba(33, 150, 243, 0.15);
    border: 1px solid rgba(33, 150, 243, 0.3);
    color: #42a5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
  }

  .provider-titles {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .provider-name {
    font-weight: 700;
    font-size: 0.88rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .provider-count {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .provider-group-totals {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .provider-total {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 0.8rem;
    white-space: nowrap;
  }

  .provider-total.unpaid {
    background: rgba(255, 179, 0, 0.15);
    border: 1px solid rgba(255, 179, 0, 0.35);
    color: #ffca28;
  }

  .provider-total.paid {
    background: rgba(76, 175, 80, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.35);
    color: #81c784;
  }

  .bills-list.in-group {
    padding-left: 0.25rem;
  }

  /* PREVIEW MODAL */
  .preview-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    padding: 1rem;
  }

  .preview-card {
    background: #1e1e24;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.85rem;
    width: 100%;
    max-width: 800px;
    height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
    overflow: hidden;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .preview-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: #fff;
  }

  .preview-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .preview-link-btn,
  .preview-close-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.15rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .preview-link-btn:hover,
  .preview-close-btn:hover {
    color: #fff;
  }

  .preview-content {
    flex: 1;
    background: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .preview-iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .preview-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  @media (max-width: 600px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }
    .actions-and-filters-row {
      flex-direction: column;
      align-items: stretch;
    }
    .filter-controls-right {
      justify-content: space-between;
    }
  }
</style>
