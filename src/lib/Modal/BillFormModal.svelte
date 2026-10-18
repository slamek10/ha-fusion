<script lang="ts">
  import { base } from "$app/paths";
  import { lang, ripple, motion } from "$lib/Stores";
  import Icon from "@iconify/svelte";
  import Ripple from "$lib/Actions/ripple";
  import { fade } from "svelte/transition";
  import {
    billsStore,
    addBill,
    updateBill,
    updateBillType,
    getCurrentMonthStr,
    type BillEntry,
    type BillType,
    type SubBill,
  } from "$lib/Stores/bills";

  let {
    isOpen = true,
    bill = undefined,
    defaultMonth = undefined,
    onClose = () => {},
  }: {
    isOpen: boolean;
    bill?: BillEntry;
    defaultMonth?: string;
    onClose?: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const isEditing = Boolean(bill?.id);

  // svelte-ignore state_referenced_locally
  let typeId = $state(bill?.type_id || $billsStore.types[0]?.id || "internet");
  // svelte-ignore state_referenced_locally
  let provider = $state(bill?.provider || "");
  // svelte-ignore state_referenced_locally
  let title = $state(bill?.title || "");
  // svelte-ignore state_referenced_locally
  let amount = $state<number | undefined>(bill?.amount);
  // svelte-ignore state_referenced_locally
  let month = $state(bill?.month || defaultMonth || getCurrentMonthStr());
  // svelte-ignore state_referenced_locally
  let issueDate = $state(
    bill?.issue_date || new Date().toISOString().split("T")[0],
  );
  // svelte-ignore state_referenced_locally
  let dueDate = $state(bill?.due_date || "");
  // svelte-ignore state_referenced_locally
  let paid = $state(bill?.paid || false);
  // svelte-ignore state_referenced_locally
  let paidDate = $state(bill?.paid_date || "");
  // svelte-ignore state_referenced_locally
  let notes = $state(bill?.notes || "");
  // svelte-ignore state_referenced_locally
  let fileUrl = $state<string | null>(bill?.file_url || null);
  // svelte-ignore state_referenced_locally
  let fileName = $state<string | null>(bill?.file_name || null);
  // svelte-ignore state_referenced_locally
  let fileType = $state<string | null>(bill?.file_type || null);

  // svelte-ignore state_referenced_locally
  let subBills = $state<SubBill[]>(
    bill?.sub_bills ? JSON.parse(JSON.stringify(bill.sub_bills)) : [],
  );
  // svelte-ignore state_referenced_locally
  let showSubBills = $state(
    Boolean(bill?.sub_bills && bill.sub_bills.length > 0),
  );

  // svelte-ignore state_referenced_locally
  let isFixedAmount = $state(Boolean(bill?.fixed_amount ?? false));

  let uploading = $state(false);
  let aiScanning = $state(false);
  let scanMessage = $state("");
  let scanSuccess = $state(false);
  let errorMessage = $state("");
  let saving = $state(false);

  let currency = $derived($billsStore.settings?.currency || "€");
  let selectedType = $derived($billsStore.types.find((t) => t.id === typeId));

  // Set default due date based on selected bill type if empty
  $effect(() => {
    if (!dueDate && month) {
      const selected = $billsStore.types.find((t) => t.id === typeId);
      const day = String(selected?.due_day || 20).padStart(2, "0");
      dueDate = `${month}-${day}`;
    }
  });

  // If title is empty, auto-fill from selected bill type
  $effect(() => {
    const selected = $billsStore.types.find((t) => t.id === typeId);
    if (!title && selected) {
      title = selected.name;
    }
    if (!provider && selected?.provider) {
      provider = selected.provider;
    }
    if (selected && !isEditing) {
      isFixedAmount = Boolean(selected.fixed_amount);
      if (selected.fixed_amount && (amount === undefined || amount === 0)) {
        amount = selected.expected_amount || 0;
      }
    }
  });

  // Keep total amount and paid status synced with subBills if present
  $effect(() => {
    if (subBills.length > 0) {
      const sum = subBills.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
      amount = Math.round(sum * 100) / 100;
      paid = subBills.every((s) => s.paid);
    }
  });

  function addSubBillItem(customTitle = "") {
    showSubBills = true;
    subBills = [
      ...subBills,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: customTitle,
        amount: 0,
        paid: false,
      },
    ];
  }

  function removeSubBillItem(id: string) {
    subBills = subBills.filter((s) => s.id !== id);
  }

  function toggleSubBillPaidItem(id: string) {
    subBills = subBills.map((s) => {
      if (s.id === id) {
        const nextPaid = !s.paid;
        return {
          ...s,
          paid: nextPaid,
          paid_date: nextPaid ? new Date().toISOString().split("T")[0] : null,
        };
      }
      return s;
    });
  }

  function loadPresetSubTypes() {
    if (selectedType?.sub_types && selectedType.sub_types.length > 0) {
      showSubBills = true;
      for (const name of selectedType.sub_types) {
        if (
          !subBills.some((s) => s.title.toLowerCase() === name.toLowerCase())
        ) {
          addSubBillItem(name);
        }
      }
    }
  }

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    uploading = true;
    errorMessage = "";
    scanMessage = "Prijenos i automatsko očitavanje računa...";
    scanSuccess = false;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${base}/_api/bills/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Greška pri prijenosu datoteke");
      }

      const data = await res.json();
      fileUrl = data.file_url;
      fileName = data.file_name;
      fileType = data.file_type;

      // If local PDF scan found info
      if (data.extracted) {
        if (
          data.extracted.amount !== null &&
          data.extracted.amount !== undefined
        ) {
          amount = Number(data.extracted.amount);
          scanSuccess = true;
          scanMessage = `Automatski očitan iznos: ${amount.toFixed(2)} ${currency}`;
        }
        if (data.extracted.due_date) {
          dueDate = data.extracted.due_date;
        }
        if (data.extracted.issue_date) {
          issueDate = data.extracted.issue_date;
        }
        if (data.extracted.provider_hint) {
          provider = data.extracted.provider_hint;
        }
        if (data.extracted.title_hint) {
          title = data.extracted.title_hint;
        }
        if (data.extracted.type_hint) {
          const matched = $billsStore.types.find(
            (t) =>
              t.id === data.extracted.type_hint ||
              t.name.toLowerCase().includes(data.extracted.type_hint),
          );
          if (matched) typeId = matched.id;
        }
      }

      // If local scan did not find amount, try AI scan (checks settings or env key)
      if (amount === undefined || isNaN(amount) || amount === null) {
        await runAiScan(data.file_name, fileType || "image/jpeg");
      } else if (!scanSuccess) {
        scanMessage =
          "Datoteka je spremljena. Možete ručno unijeti ili potvrditi iznos.";
      }
    } catch (err: any) {
      errorMessage = err?.message || "Greška pri obradi računa.";
    } finally {
      uploading = false;
    }
  }

  async function runAiScan(savedName: string, mime: string) {
    aiScanning = true;
    scanMessage = "AI analizira račun i prepoznaje detalje...";
    try {
      const res = await fetch(`${base}/_api/bills/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: savedName,
          mimeType: mime,
          apiKey: $billsStore.settings.ai_api_key,
          provider: $billsStore.settings.ai_provider || "gemini",
          model: $billsStore.settings.ai_model,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          if (json.data.amount) amount = Number(json.data.amount);
          if (json.data.due_date) dueDate = json.data.due_date;
          if (json.data.issue_date) issueDate = json.data.issue_date;
          if (json.data.provider) provider = json.data.provider;
          if (json.data.title) title = json.data.title;
          if (json.data.type_hint) {
            const found = $billsStore.types.find(
              (t) =>
                t.id === json.data.type_hint ||
                t.name.toLowerCase().includes(json.data.type_hint),
            );
            if (found) typeId = found.id;
          }
          scanSuccess = true;
          scanMessage = `Automatski očitan iznos: ${amount?.toFixed(2)} ${currency}`;
        }
      } else if (!scanSuccess) {
        scanMessage =
          "Datoteka je spremljena. Možete ručno unijeti ili potvrditi iznos.";
      }
    } catch (err) {
      console.warn("AI scan error:", err);
    } finally {
      aiScanning = false;
    }
  }

  async function handleSubmit() {
    if (amount === undefined || isNaN(amount) || amount === null) {
      errorMessage = "Molimo unesite iznos računa.";
      return;
    }

    saving = true;
    errorMessage = "";

    const billPayload: Partial<BillEntry> = {
      type_id: typeId,
      title: title.trim() || "Račun",
      provider: provider.trim() || undefined,
      amount: Number(amount),
      currency: currency,
      month: month,
      issue_date: issueDate || undefined,
      due_date: dueDate || undefined,
      paid: Boolean(paid),
      paid_date: paid
        ? paidDate || new Date().toISOString().split("T")[0]
        : null,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      notes: notes.trim() || undefined,
      sub_bills: subBills.length > 0 ? subBills : undefined,
      fixed_amount: isFixedAmount,
    };

    let result;
    if (isEditing && bill?.id) {
      result = await updateBill(bill.id, billPayload);
    } else {
      result = await addBill(billPayload as any);
    }

    if (isFixedAmount && typeId) {
      await updateBillType(typeId, {
        fixed_amount: true,
        expected_amount: Number(amount),
      });
    }

    saving = false;
    if (result.ok) {
      onClose();
    } else {
      errorMessage = result.error || "Greška pri spremanju računa.";
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" transition:fade={{ duration: 150 }}>
    <div class="modal-card">
      <div class="modal-header">
        <div class="title-with-icon">
          <Icon icon="mdi:receipt-text" class="modal-title-icon" />
          <h3>{isEditing ? "Uredi račun" : "Dodaj / Učitaj račun"}</h3>
        </div>
        <button type="button" class="close-btn" onclick={onClose}>
          <Icon icon="mdi:close" />
        </button>
      </div>

      <div class="modal-content">
        <!-- FILE UPLOAD DROPZONE -->
        <div class="upload-section">
          <label class="dropzone" class:active={uploading || aiScanning}>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onchange={handleFileUpload}
              style="display: none;"
            />
            {#if uploading || aiScanning}
              <Icon icon="mdi:loading" class="spin dropzone-icon" />
              <span class="dropzone-text">{scanMessage}</span>
            {:else if fileName}
              <Icon
                icon={fileType?.includes("pdf")
                  ? "mdi:file-pdf-box"
                  : "mdi:file-image"}
                class="dropzone-icon active"
              />
              <div class="file-uploaded-info">
                <span class="file-name">{fileName}</span>
                <span class="file-change-hint"
                  >Kliknite za zamjenu datoteke računa</span
                >
              </div>
            {:else}
              <Icon icon="mdi:cloud-upload-outline" class="dropzone-icon" />
              <div class="dropzone-text-group">
                <span class="dropzone-main"
                  >Prenesi PDF ili sliku računa s emaila</span
                >
                <span class="dropzone-sub"
                  >Automatski očitavamo iznos i podatke s računa</span
                >
              </div>
            {/if}
          </label>

          {#if scanMessage && !uploading && !aiScanning}
            <div
              class="scan-banner"
              class:success={scanSuccess}
              transition:fade
            >
              <Icon
                icon={scanSuccess ? "mdi:check-circle" : "mdi:information"}
              />
              <span>{scanMessage}</span>
            </div>
          {/if}

          {#if errorMessage}
            <div class="error-banner" transition:fade>
              <Icon icon="mdi:alert-circle" />
              <span>{errorMessage}</span>
            </div>
          {/if}
        </div>

        <!-- FORM FIELDS -->
        <div class="form-grid">
          <!-- BILL TYPE -->
          <div class="form-group">
            <label for="bill-type-select">Vrsta računa *</label>
            <select
              id="bill-type-select"
              bind:value={typeId}
              class="text-input"
            >
              {#each $billsStore.types as t}
                <option value={t.id}
                  >{t.name} {t.provider ? `(${t.provider})` : ""}</option
                >
              {/each}
            </select>
          </div>

          <!-- PROVIDER -->
          <div class="form-group">
            <label for="bill-provider-input">Pružatelj / Izdavatelj</label>
            <input
              id="bill-provider-input"
              type="text"
              bind:value={provider}
              placeholder="npr. Uniqa Osiguranje, A1, HEP..."
              class="text-input"
            />
          </div>

          <!-- TITLE -->
          <div class="form-group">
            <label for="bill-title-input">Naziv / Opis</label>
            <input
              id="bill-title-input"
              type="text"
              bind:value={title}
              placeholder="npr. Uniqa Osiguranja - Paket"
              class="text-input"
            />
          </div>

          <!-- AMOUNT (Crucial!) -->
          <div class="form-group amount-group">
            <label for="bill-amount-input"
              >Iznos računa * ({currency})
              {#if subBills.length > 0}
                <span class="auto-sum-badge"
                  >(Zbroj {subBills.length} stavki)</span
                >
              {/if}
            </label>
            <div class="amount-input-wrapper">
              <span class="currency-prefix">{currency}</span>
              <input
                id="bill-amount-input"
                type="number"
                step="0.01"
                min="0"
                bind:value={amount}
                readonly={subBills.length > 0}
                placeholder="0.00"
                class="text-input amount-input"
              />
            </div>
            <label class="modal-inline-checkbox">
              <input
                type="checkbox"
                bind:checked={isFixedAmount}
                class="checkbox-input-sm"
              />
              <span
                >Isti iznos svaki mjesec (fiksno kao Netflix, osiguranje)</span
              >
            </label>
          </div>

          <!-- MONTH -->
          <div class="form-group">
            <label for="bill-month-input">Mjesec računa (GGGG-MM) *</label>
            <input
              id="bill-month-input"
              type="month"
              bind:value={month}
              class="text-input"
            />
          </div>

          <!-- DUE DATE -->
          <div class="form-group">
            <label for="bill-due-input">Rok plaćanja (dospijeće)</label>
            <input
              id="bill-due-input"
              type="date"
              bind:value={dueDate}
              class="text-input"
            />
          </div>

          <!-- ISSUE DATE -->
          <div class="form-group">
            <label for="bill-issue-input">Datum izdavanja računa</label>
            <input
              id="bill-issue-input"
              type="date"
              bind:value={issueDate}
              class="text-input"
            />
          </div>
        </div>

        <!-- SUB-BILLS / ITEMIZED BREAKDOWN -->
        <div class="sub-bills-card">
          <div class="sub-bills-header">
            <div class="sub-bills-title-group">
              <Icon icon="mdi:format-list-checks" class="sub-bills-icon" />
              <div class="sub-bills-titles">
                <span class="sub-bills-title">Stavke i podračuni</span>
                <span class="sub-bills-desc"
                  >Npr. Kuća, Vanjsko osiguranje, Zdravstveno (Uniqa)</span
                >
              </div>
            </div>

            <div class="sub-bills-header-actions">
              {#if selectedType?.sub_types && selectedType.sub_types.length > 0}
                <button
                  type="button"
                  class="btn-sub-pill outline"
                  onclick={loadPresetSubTypes}
                  title="Učitaj unaprijed definirane stavke za {selectedType.name}"
                >
                  <Icon icon="mdi:auto-fix" />
                  <span>Učitaj predloške ({selectedType.sub_types.length})</span
                  >
                </button>
              {/if}
              <button
                type="button"
                class="btn-sub-pill primary"
                onclick={() => addSubBillItem()}
              >
                <Icon icon="mdi:plus" />
                <span>Dodaj stavku</span>
              </button>
            </div>
          </div>

          {#if subBills.length > 0}
            <div class="sub-bills-list" transition:fade={{ duration: 120 }}>
              {#each subBills as sub (sub.id)}
                <div class="sub-bill-row" class:paid={sub.paid}>
                  <div class="sub-bill-col-title">
                    <input
                      type="text"
                      bind:value={sub.title}
                      placeholder="Naziv stavke (npr. Osiguranje kuće)"
                      class="text-input small"
                    />
                  </div>

                  <div class="sub-bill-col-amount">
                    <div class="amount-input-wrapper small">
                      <span class="currency-prefix">{currency}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={sub.amount}
                        placeholder="0.00"
                        class="text-input amount-input small"
                      />
                    </div>
                  </div>

                  <div class="sub-bill-col-status">
                    <button
                      type="button"
                      class="btn-sub-status"
                      class:paid={sub.paid}
                      onclick={() => toggleSubBillPaidItem(sub.id)}
                    >
                      <Icon
                        icon={sub.paid
                          ? "mdi:check-circle"
                          : "mdi:clock-outline"}
                      />
                      <span>{sub.paid ? "Plaćeno" : "Neplaćeno"}</span>
                    </button>
                  </div>

                  <div class="sub-bill-col-actions">
                    <button
                      type="button"
                      class="btn-sub-delete"
                      title="Ukloni stavku"
                      onclick={() => removeSubBillItem(sub.id)}
                    >
                      <Icon icon="mdi:trash-can-outline" />
                    </button>
                  </div>
                </div>
              {/each}

              <div class="sub-bills-summary">
                <span class="summary-label">
                  Ukupno ({subBills.length}
                  {subBills.length === 1 ? "stavka" : "stavki"}):
                </span>
                <span class="summary-amount">
                  {amount?.toFixed(2) || "0.00"}
                  {currency}
                </span>
                {#if subBills.some((s) => !s.paid)}
                  <span class="summary-unpaid-badge">
                    Preostalo za platiti: {subBills
                      .filter((s) => !s.paid)
                      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
                      .toFixed(2)}
                    {currency}
                  </span>
                {:else}
                  <span class="summary-all-paid-badge">
                    <Icon icon="mdi:check-all" /> Sve stavke plaćene
                  </span>
                {/if}
              </div>
            </div>
          {:else}
            <div class="sub-bills-empty-hint">
              <span
                >Nema pojedinačnih podračuna. Račun možete unijeti kao cjelinu
                ili kliknuti <strong>+ Dodaj stavku</strong> za raščlanjeno praćenje.</span
              >
            </div>
          {/if}
        </div>

        <!-- STATUS: PAID / UNPAID SWITCH -->
        <div class="status-toggle-card" class:paid>
          <div class="status-left">
            <div class="status-icon-box">
              <Icon
                icon={paid ? "mdi:check-circle" : "mdi:clock-alert-outline"}
              />
            </div>
            <div class="status-texts">
              <span class="status-heading"
                >{paid ? "Račun je PLAĆEN" : "Račun NIJE plaćen"}</span
              >
              <span class="status-sub">
                {paid
                  ? "Iznos se ubraja u plaćene račune"
                  : "Iznos se prikazuje kao preostalo za platiti"}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="toggle-btn"
            class:paid
            onclick={() => {
              paid = !paid;
              if (paid && !paidDate) {
                paidDate = new Date().toISOString().split("T")[0];
              }
              if (subBills.length > 0) {
                subBills = subBills.map((s) => ({
                  ...s,
                  paid: paid,
                  paid_date: paid
                    ? paidDate || new Date().toISOString().split("T")[0]
                    : null,
                }));
              }
            }}
          >
            <span class="toggle-indicator"></span>
            <span class="toggle-label">{paid ? "Plaćeno" : "Neplaćeno"}</span>
          </button>
        </div>

        {#if paid}
          <div class="form-group" transition:fade={{ duration: 120 }}>
            <label for="bill-paid-date-input">Datum plaćanja</label>
            <input
              id="bill-paid-date-input"
              type="date"
              bind:value={paidDate}
              class="text-input"
            />
          </div>
        {/if}

        <!-- ATTACHMENT PREVIEW IF EXISTS -->
        {#if fileUrl}
          <div class="attachment-preview-bar">
            <Icon
              icon={fileType?.includes("pdf")
                ? "mdi:file-pdf-box"
                : "mdi:file-image"}
              class="preview-icon"
            />
            <div class="preview-meta">
              <span class="file-title">{fileName}</span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                class="view-link"
              >
                Otvori / pregledaj račun <Icon icon="mdi:open-in-new" />
              </a>
            </div>
            <button
              type="button"
              class="remove-file-btn"
              title="Ukloni datoteku"
              onclick={() => {
                fileUrl = null;
                fileName = null;
                fileType = null;
              }}
            >
              <Icon icon="mdi:trash-can-outline" />
            </button>
          </div>
        {/if}

        <!-- NOTES -->
        <div class="form-group">
          <label for="bill-notes-input"
            >Napomena / Poziv na broj (opcionalno)</label
          >
          <input
            id="bill-notes-input"
            type="text"
            bind:value={notes}
            placeholder="npr. Platiti s tekućeg računa nakon plaće"
            class="text-input"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={onClose}>
          Odustani
        </button>
        <button
          type="button"
          class="btn-submit"
          onclick={handleSubmit}
          disabled={saving || uploading}
          use:Ripple={$ripple}
        >
          <Icon icon="mdi:check" />
          <span
            >{saving
              ? "Spremanje..."
              : isEditing
                ? "Ažuriraj račun"
                : "Spremi račun"}</span
          >
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
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
    z-index: 10000;
    padding: 1rem;
  }

  .modal-card {
    background: #1c1d22;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1rem;
    width: 100%;
    max-width: 580px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
    max-height: 92vh;
    overflow-y: auto;
    color: #e0e0e0;
    font-family: inherit;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.35rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  :global(.modal-title-icon) {
    color: #2196f3;
    font-size: 1.4rem;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.3rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0.25rem;
    border-radius: 0.35rem;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .modal-content {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dropzone {
    border: 2px dashed rgba(33, 150, 243, 0.4);
    background: rgba(33, 150, 243, 0.06);
    border-radius: 0.85rem;
    padding: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .dropzone:hover,
  .dropzone.active {
    border-color: #2196f3;
    background: rgba(33, 150, 243, 0.12);
  }

  :global(.dropzone-icon) {
    font-size: 2rem;
    color: #2196f3;
    flex-shrink: 0;
  }

  :global(.dropzone-icon.active) {
    color: #4caf50;
  }

  .dropzone-text-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .dropzone-main {
    font-weight: 600;
    font-size: 0.92rem;
    color: #fff;
  }

  .dropzone-sub {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .file-uploaded-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .file-name {
    font-weight: 600;
    color: #81c784;
    font-size: 0.92rem;
    word-break: break-all;
  }

  .file-change-hint {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .scan-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.85rem;
    border-radius: 0.5rem;
    background: rgba(33, 150, 243, 0.15);
    border: 1px solid rgba(33, 150, 243, 0.3);
    color: #64b5f6;
    font-size: 0.85rem;
  }

  .scan-banner.success {
    background: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.35);
    color: #81c784;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.85rem;
    border-radius: 0.5rem;
    background: rgba(244, 67, 54, 0.15);
    border: 1px solid rgba(244, 67, 54, 0.35);
    color: #e57373;
    font-size: 0.85rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
  }

  @media (max-width: 500px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-group label {
    font-size: 0.82rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
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

  .amount-group {
    grid-column: 1 / -1;
  }

  .amount-input-wrapper {
    display: flex;
    align-items: center;
    position: relative;
  }

  .currency-prefix {
    position: absolute;
    left: 0.85rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: #ffb300;
    pointer-events: none;
  }

  .amount-input {
    padding-left: 2.3rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffb300;
    letter-spacing: 0.5px;
  }

  .modal-inline-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 0.35rem;
    cursor: pointer;
    user-select: none;
    transition: color 0.2s;
  }

  .modal-inline-checkbox:hover {
    color: #fff;
  }

  .checkbox-input-sm {
    width: 0.95rem;
    height: 0.95rem;
    accent-color: #2196f3;
    cursor: pointer;
  }

  /* STATUS TOGGLE CARD */
  .status-toggle-card {
    background: rgba(255, 179, 0, 0.1);
    border: 1px solid rgba(255, 179, 0, 0.25);
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    transition: all 0.25s;
  }

  .status-toggle-card.paid {
    background: rgba(76, 175, 80, 0.12);
    border-color: rgba(76, 175, 80, 0.3);
  }

  .status-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status-icon-box {
    font-size: 1.5rem;
    color: #ffb300;
    display: flex;
  }

  .status-toggle-card.paid .status-icon-box {
    color: #4caf50;
  }

  .status-texts {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .status-heading {
    font-weight: 600;
    font-size: 0.95rem;
    color: #fff;
  }

  .status-sub {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .toggle-btn {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 2rem;
    padding: 0.4rem 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .toggle-btn.paid {
    background: #2e7d32;
    border-color: #4caf50;
  }

  .toggle-indicator {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
    background: #ffb300;
  }

  .toggle-btn.paid .toggle-indicator {
    background: #a5d6a7;
  }

  .attachment-preview-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.6rem;
    padding: 0.6rem 0.85rem;
  }

  :global(.preview-icon) {
    font-size: 1.6rem;
    color: #e53935;
  }

  .preview-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
  }

  .file-title {
    font-size: 0.85rem;
    font-weight: 500;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .view-link {
    font-size: 0.78rem;
    color: #64b5f6;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .view-link:hover {
    text-decoration: underline;
  }

  .remove-file-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.35rem;
  }

  .remove-file-btn:hover {
    color: #f44336;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.1rem 1.35rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .btn-cancel {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
    padding: 0.55rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-submit {
    background: #2196f3;
    border: none;
    color: #fff;
    padding: 0.55rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.92rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.2s;
  }

  .btn-submit:hover {
    opacity: 0.9;
  }

  .auto-sum-badge {
    font-size: 0.75rem;
    color: #42a5f5;
    font-weight: 500;
    margin-left: 0.35rem;
  }

  .sub-bills-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .sub-bills-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .sub-bills-title-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  :global(.sub-bills-icon) {
    font-size: 1.35rem;
    color: #2196f3;
  }

  .sub-bills-titles {
    display: flex;
    flex-direction: column;
  }

  .sub-bills-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #fff;
  }

  .sub-bills-desc {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.55);
  }

  .sub-bills-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-sub-pill {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.7rem;
    border-radius: 2rem;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }

  .btn-sub-pill.primary {
    background: #1976d2;
    border: 1px solid #2196f3;
    color: #fff;
  }

  .btn-sub-pill.primary:hover {
    background: #2196f3;
  }

  .btn-sub-pill.outline {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #90caf9;
  }

  .btn-sub-pill.outline:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .sub-bills-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sub-bill-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.5rem;
    padding: 0.5rem 0.65rem;
    transition: border-color 0.2s;
  }

  .sub-bill-row.paid {
    border-color: rgba(76, 175, 80, 0.3);
    background: rgba(46, 125, 50, 0.08);
  }

  .sub-bill-col-title {
    flex: 1;
    min-width: 140px;
  }

  .sub-bill-col-amount {
    width: 110px;
  }

  .text-input.small {
    padding: 0.4rem 0.65rem;
    font-size: 0.85rem;
  }

  .amount-input-wrapper.small .currency-prefix {
    padding: 0.4rem 0.5rem;
    font-size: 0.82rem;
  }

  .amount-input-wrapper.small .amount-input {
    padding: 0.4rem 0.5rem;
    font-size: 0.85rem;
  }

  .btn-sub-status {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 1.5rem;
    padding: 0.35rem 0.65rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .btn-sub-status.paid {
    background: #2e7d32;
    border-color: #4caf50;
    color: #fff;
  }

  .btn-sub-delete {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 0.35rem;
    font-size: 1rem;
    display: flex;
    align-items: center;
    border-radius: 0.35rem;
    transition: color 0.2s;
  }

  .btn-sub-delete:hover {
    color: #f44336;
    background: rgba(244, 67, 54, 0.1);
  }

  .sub-bills-summary {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem 0.2rem 0.5rem;
    font-size: 0.85rem;
    flex-wrap: wrap;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
  }

  .summary-label {
    color: rgba(255, 255, 255, 0.65);
  }

  .summary-amount {
    font-weight: 700;
    color: #fff;
    font-size: 0.95rem;
  }

  .summary-unpaid-badge {
    background: rgba(255, 179, 0, 0.15);
    border: 1px solid rgba(255, 179, 0, 0.35);
    color: #ffca28;
    padding: 0.2rem 0.55rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .summary-all-paid-badge {
    background: rgba(76, 175, 80, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.35);
    color: #81c784;
    padding: 0.2rem 0.55rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .sub-bills-empty-hint {
    padding: 0.5rem;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
  }
</style>
