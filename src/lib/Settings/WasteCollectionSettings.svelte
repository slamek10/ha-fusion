<script lang="ts">
	import { base } from '$app/paths';
	import { lang, ripple, motion, dashboard, updateDashboard } from '$lib/Stores';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import { fade } from 'svelte/transition';
	import {
		wasteCollectionStore,
		fetchWasteCollection,
		saveWasteCollection,
		getNextCollection,
		formatDateHR,
		formatCollectionCountdown,
		type WasteCategory,
		type WasteCollectionData
	} from '$lib/Stores/wasteCollection';
	import { onMount } from 'svelte';

	let loading = $state(false);
	let saving = $state(false);
	let saveSuccess = $state(false);
	let uploadSuccess = $state(false);
	let errorMessage = $state('');
	let showCalendarImage = $state(false);
	let showAiModal = $state(false);
	let showHaExportModal = $state(false);
	let showJsonModal = $state(false);
	let jsonText = $state('');

	// AI Extraction config
	let aiApiKey = $state(
		typeof localStorage !== 'undefined' ? localStorage.getItem('ha_fusion_ai_api_key') || '' : ''
	);
	let aiProvider = $state<'gemini' | 'openai'>('gemini');
	let aiLoading = $state(false);
	let aiMessage = $state('');

	// New date entry for category
	let newDateInputs = $state<Record<string, string>>({});
	let bulkDateInputs = $state<Record<string, string>>({});
	let activeTab = $state<'list' | 'calendar_view'>('list');

	let calendarImageUrl = $state(
		`/_api/waste_collection/image?t=${Date.now()}`
	);

	onMount(async () => {
		loading = true;
		await fetchWasteCollection(true);
		loading = false;
	});

	async function handleSave() {
		saving = true;
		saveSuccess = false;
		errorMessage = '';
		const result = await saveWasteCollection($wasteCollectionStore);
		saving = false;
		if (result.ok) {
			saveSuccess = true;
			setTimeout(() => {
				saveSuccess = false;
			}, 3000);
		} else {
			errorMessage = result.error || 'Greška pri spremanju.';
		}
	}

	async function readFileOptimized(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				if (file.size <= 800 * 1024) {
					return resolve(result);
				}
				const img = new Image();
				img.onload = () => {
					let width = img.width;
					let height = img.height;
					const maxDim = 2048;
					if (width > maxDim || height > maxDim) {
						if (width > height) {
							height = Math.round((height * maxDim) / width);
							width = maxDim;
						} else {
							width = Math.round((width * maxDim) / height);
							height = maxDim;
						}
					}
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					if (!ctx) return resolve(result);
					ctx.drawImage(img, 0, 0, width, height);
					resolve(canvas.toDataURL('image/jpeg', 0.88));
				};
				img.onerror = () => resolve(result);
				img.src = result;
			};
			reader.onerror = () => reject(new Error('Neuspjelo čitanje datoteke'));
			reader.readAsDataURL(file);
		});
	}

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		loading = true;
		errorMessage = '';

		try {
			const base64 = await readFileOptimized(file);

			const res = await fetch(`${base}/_api/waste_collection/upload`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					image: base64,
					name: file.name
				})
			});

			if (res.ok) {
				const json = await res.json();
				calendarImageUrl = `${base}/_api/waste_collection/image?t=${Date.now()}`;
				$wasteCollectionStore.has_calendar_image = true;
				$wasteCollectionStore.calendar_image = calendarImageUrl;
				uploadSuccess = true;
				showCalendarImage = true;
				setTimeout(() => {
					uploadSuccess = false;
				}, 3000);

				// Automatically analyze calendar image right after upload!
				if (aiApiKey.trim()) {
					runAiExtraction();
				} else {
					showAiModal = true;
					aiMessage =
						'Slika je učitana! Unesite besplatni Gemini API ključ kako bi AI automatski prepoznao sve datume.';
				}
			} else {
				const err = await res.text();
				errorMessage = `Upload nije uspio: ${err}`;
			}
		} catch (err: any) {
			errorMessage = `Greška: ${err?.message || err}`;
		} finally {
			loading = false;
			target.value = '';
		}
	}

	async function runAiExtraction() {
		if (!aiApiKey.trim()) {
			aiMessage = 'Molimo unesite API ključ.';
			return;
		}

		aiLoading = true;
		aiMessage = 'AI analizira sliku kalendara i pronalazi datume...';

		try {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('ha_fusion_ai_api_key', aiApiKey);
			}

			const res = await fetch(`${base}/_api/waste_collection/ai_extract`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: aiApiKey.trim(),
					provider: aiProvider
				})
			});

			if (res.ok) {
				const json = await res.json();
				if (json.data && Array.isArray(json.data.categories)) {
					$wasteCollectionStore.categories = json.data.categories;
					if (json.data.year) $wasteCollectionStore.year = json.data.year;
					if (json.data.location) $wasteCollectionStore.location = json.data.location;
					await handleSave();
					aiMessage = 'Uspješno izvučeni datumi! Raspored je ažuriran.';
					setTimeout(() => {
						showAiModal = false;
					}, 2000);
				} else {
					aiMessage = 'AI model je vratio podatke u neočekivanom formatu.';
				}
			} else {
				const err = await res.text();
				aiMessage = `Greška: ${err}`;
			}
		} catch (err: any) {
			aiMessage = `Greška pri pozivu: ${err?.message || err}`;
		} finally {
			aiLoading = false;
		}
	}



	function addDateToCategory(catId: string) {
		const val = newDateInputs[catId]?.trim();
		if (!val) return;
		const cat = $wasteCollectionStore.categories.find((c) => c.id === catId);
		if (cat) {
			if (!cat.dates.includes(val)) {
				cat.dates = [...cat.dates, val].sort();
				newDateInputs[catId] = '';
				handleSave();
			}
		}
	}

	function removeDateFromCategory(catId: string, dStr: string) {
		const cat = $wasteCollectionStore.categories.find((c) => c.id === catId);
		if (cat) {
			cat.dates = cat.dates.filter((d) => d !== dStr);
			handleSave();
		}
	}

	function parseBulkDates(catId: string) {
		const text = bulkDateInputs[catId]?.trim();
		if (!text) return;
		const cat = $wasteCollectionStore.categories.find((c) => c.id === catId);
		if (!cat) return;

		const year = $wasteCollectionStore.year || 2026;
		const added: string[] = [];

		// Match either YYYY-MM-DD or DD.MM. or D.M.
		const lines = text.split(/[\n,;]+/);
		for (const raw of lines) {
			const item = raw.trim();
			if (!item) continue;
			if (/^\d{4}-\d{2}-\d{2}$/.test(item)) {
				added.push(item);
			} else {
				const match = item.match(/^(\d{1,2})\.(\d{1,2})\.?/);
				if (match) {
					const day = match[1].padStart(2, '0');
					const month = match[2].padStart(2, '0');
					added.push(`${year}-${month}-${day}`);
				}
			}
		}

		if (added.length > 0) {
			const set = new Set([...cat.dates, ...added]);
			cat.dates = Array.from(set).sort();
			bulkDateInputs[catId] = '';
			handleSave();
		}
	}

	function addCategory() {
		const newId = `custom_${Date.now()}`;
		$wasteCollectionStore.categories = [
			...$wasteCollectionStore.categories,
			{
				id: newId,
				name: 'Nova vrsta otpada',
				color: '#795548',
				icon: 'mdi:trash-can-outline',
				dates: []
			}
		];
		handleSave();
	}

	function removeCategory(catId: string) {
		if (confirm('Jeste li sigurni da želite obrisati ovu vrstu otpada?')) {
			$wasteCollectionStore.categories = $wasteCollectionStore.categories.filter(
				(c) => c.id !== catId
			);
			handleSave();
		}
	}

	function addAllCardsToDashboard() {
		if (!$dashboard.views || $dashboard.views.length === 0) return;
		const currentView = $dashboard.views[0];
		if (!currentView.sections) currentView.sections = [];
		if (currentView.sections.length === 0) {
			currentView.sections.push({ id: Date.now(), name: 'Odvoz otpada', items: [] });
		}
		const section = currentView.sections[0];
		if (!section.items) section.items = [];

		const mainTypes = ['bio', 'komunalni', 'plastika', 'papir', 'metal_staklo'];
		const catsToAdd = $wasteCollectionStore.categories.filter((c) =>
			mainTypes.includes(c.id)
		);

		for (const cat of catsToAdd) {
			section.items.push({
				id: Date.now() + Math.floor(Math.random() * 10000),
				type: 'waste_collection',
				category_id: cat.id,
				name: cat.name,
				icon: cat.icon,
				color: cat.color
			} as any);
		}

		$dashboard = $dashboard;
		alert('Kartice odvoza otpada dodane su na vašu radnu površinu!');
	}

	function generateHomeAssistantYaml(): string {
		const year = $wasteCollectionStore.year || 2026;
		let yaml = `# Home Assistant sensors for waste collection (${year})\n`;
		yaml += `template:\n  - sensor:\n`;

		for (const cat of $wasteCollectionStore.categories) {
			const datesList = JSON.stringify(cat.dates);
			yaml += `      - name: "Odvoz ${cat.name}"\n`;
			yaml += `        unique_id: waste_${cat.id}\n`;
			yaml += `        icon: "${cat.icon}"\n`;
			yaml += `        state: >\n`;
			yaml += `          {% set dates = ${datesList} %}\n`;
			yaml += `          {% set now_date = now().strftime('%Y-%m-%d') %}\n`;
			yaml += `          {% set upcoming = dates | select('>=', now_date) | list %}\n`;
			yaml += `          {% if upcoming | length > 0 %}\n`;
			yaml += `            {% set next_d = strptime(upcoming[0], '%Y-%m-%d') %}\n`;
			yaml += `            {% set diff = (next_d.date() - now().date()).days %}\n`;
			yaml += `            {% if diff == 0 %}Danas\n`;
			yaml += `            {% elif diff == 1 %}Sljedeće za 1 dan\n`;
			yaml += `            {% else %}Sljedeće za {{ diff }} dana\n`;
			yaml += `            {% endif %}\n`;
			yaml += `          {% else %}Nema termina{% endif %}\n`;
			yaml += `        attributes:\n`;
			yaml += `          color: "${cat.color}"\n`;
			yaml += `          next_date: >\n`;
			yaml += `            {% set upcoming = ${datesList} | select('>=', now().strftime('%Y-%m-%d')) | list %}\n`;
			yaml += `            {{ upcoming[0] if upcoming | length > 0 else 'none' }}\n\n`;
		}
		return yaml;
	}
</script>

<div class="waste-settings-root">
	<!-- TOP HEADER & CONTROLS -->
	<div class="header-card">
		<div class="header-main">
			<div class="header-titles">
				<h2>Odvoz otpada</h2>
				<span class="subtitle">
					{$wasteCollectionStore.location ? `${$wasteCollectionStore.location} • ` : ''}{$wasteCollectionStore.year || 2026}.
				</span>
			</div>

			<div class="header-actions">
				<label class="btn-action upload-btn" use:Ripple={$ripple}>
					<Icon icon="mdi:upload" height="1.2rem" />
					<span>Učitaj sliku kalendara</span>
					<input
						type="file"
						accept="image/png,image/jpeg,image/webp"
						onchange={handleFileUpload}
						style="display: none;"
					/>
				</label>

				<button
					class="btn-action outline"
					type="button"
					onclick={() => (showAiModal = true)}
					use:Ripple={$ripple}
				>
					<Icon icon="mdi:auto-fix" height="1.2rem" />
					<span>AI Izdvajanje</span>
				</button>
			</div>
		</div>

		{#if uploadSuccess}
			<div class="banner success" transition:fade={{ duration: $motion }}>
				<Icon icon="mdi:check-circle" /> Slika kalendara je uspješno spremljena!
			</div>
		{/if}

		{#if errorMessage}
			<div class="banner error" transition:fade={{ duration: $motion }}>
				<Icon icon="mdi:alert-circle" /> {errorMessage}
			</div>
		{/if}

		{#if aiLoading}
			<div class="banner info" transition:fade={{ duration: $motion }}>
				<Icon icon="mdi:loading" class="spin" /> {aiMessage || 'AI analizira sliku kalendara i automatski pronalazi datume...'}
			</div>
		{/if}

		<!-- CALENDAR IMAGE PREVIEW DROPDOWN / TOGGLE -->
		{#if $wasteCollectionStore.has_calendar_image}
			<div class="calendar-toggle-row">
				<button
					class="preview-toggle-button"
					type="button"
					onclick={() => (showCalendarImage = !showCalendarImage)}
				>
					<Icon icon={showCalendarImage ? 'mdi:chevron-up' : 'mdi:image'} height="1.2rem" />
					<span>{showCalendarImage ? 'Sakrij sliku kalendara' : 'Pregledaj učitanu sliku kalendara'}</span>
				</button>

				<span class="img-badge">Slika aktivna</span>
			</div>

			{#if showCalendarImage}
				<div class="image-preview-panel" transition:fade={{ duration: $motion }}>
					<img
						src={calendarImageUrl}
						alt="Kalendar odvoza"
						class="calendar-full-img"
					/>
				</div>
			{/if}
		{/if}
	</div>

	<!-- QUICK SUMMARY / DASHBOARD BUTTONS -->
	<div class="quick-tools-row">
		<button
			class="tool-btn highlight"
			type="button"
			onclick={addAllCardsToDashboard}
			use:Ripple={$ripple}
		>
			<Icon icon="mdi:view-dashboard-outline" height="1.2rem" />
			<span>Dodaj gumbe odvoza na radnu površinu</span>
		</button>

		<button
			class="tool-btn"
			type="button"
			onclick={() => (showHaExportModal = true)}
			use:Ripple={$ripple}
		>
			<Icon icon="mdi:home-assistant" height="1.2rem" />
			<span>Izvezi Home Assistant YAML senzore</span>
		</button>

		<button
			class="tool-btn"
			type="button"
			onclick={() => {
				jsonText = JSON.stringify($wasteCollectionStore, null, 2);
				showJsonModal = true;
			}}
			use:Ripple={$ripple}
		>
			<Icon icon="mdi:code-json" height="1.2rem" />
			<span>Uredi / Izvezi JSON</span>
		</button>
	</div>

	<!-- GLOBAL TEXT FORMAT SETTINGS -->
	<div class="format-card">
		<div class="format-card-header">
			<div class="format-card-title">
				<Icon icon="mdi:format-text" height="1.2rem" />
				<h3>Format teksta na gumbima (Zadano)</h3>
			</div>
			<span class="preview-badge">
				Primjer: <strong>{formatCollectionCountdown(6, '2026-10-14', { format: $wasteCollectionStore.default_format, todayText: $wasteCollectionStore.today_text, tomorrowText: $wasteCollectionStore.tomorrow_text })}</strong>
			</span>
		</div>

		<p class="format-card-desc">
			Prilagodite tekst koji se prikazuje na svim gumbima. Koristite <code>&#123;days&#125;</code> za broj dana i <code>&#123;date&#125;</code> za datum (npr. kraći format da tekst stane u gumb bez kraćenja).
		</p>

		<div class="preset-buttons">
			{#each [
				'Sljedeće za {days} dana',
				'za {days} dana',
				'za {days} d.',
				'In {days} days',
				'{days} dana',
				'{days} d.'
			] as preset}
				<button
					type="button"
					class="btn-preset"
					class:active={$wasteCollectionStore.default_format === preset}
					onclick={() => {
						$wasteCollectionStore.default_format = preset;
						handleSave();
					}}
				>
					{preset}
				</button>
			{/each}
		</div>

		<div class="format-inputs-row">
			<div class="input-col">
				<label for="format-input-global">Predložak formata:</label>
				<input
					id="format-input-global"
					type="text"
					class="settings-text-input"
					placeholder={'Zadano: Sljedeće za {days} dana'}
					bind:value={$wasteCollectionStore.default_format}
					onchange={handleSave}
				/>
			</div>

			<div class="input-col">
				<label for="today-input-global">Tekst za danas:</label>
				<input
					id="today-input-global"
					type="text"
					class="settings-text-input"
					placeholder="Danas"
					bind:value={$wasteCollectionStore.today_text}
					onchange={handleSave}
				/>
			</div>

			<div class="input-col">
				<label for="tomorrow-input-global">Tekst za sutra (opcionalno):</label>
				<input
					id="tomorrow-input-global"
					type="text"
					class="settings-text-input"
					placeholder="Sljedeće za 1 dan ili Sutra"
					bind:value={$wasteCollectionStore.tomorrow_text}
					onchange={handleSave}
				/>
			</div>
		</div>
	</div>

	<!-- CATEGORIES LIST -->
	<div class="categories-container">
		<div class="section-title-row">
			<h3>Vrste otpada i datumi ({($wasteCollectionStore.categories || []).length})</h3>
			<button class="btn-add-cat" type="button" onclick={addCategory} use:Ripple={$ripple}>
				<Icon icon="mdi:plus" />
				<span>Dodaj novu vrstu</span>
			</button>
		</div>

		{#each $wasteCollectionStore.categories || [] as cat (cat.id)}
			{@const nextInfo = getNextCollection(cat.dates, undefined, { format: $wasteCollectionStore.default_format, todayText: $wasteCollectionStore.today_text, tomorrowText: $wasteCollectionStore.tomorrow_text })}
			<div class="category-card" style:--cat-color={cat.color}>
				<!-- CATEGORY HEADER -->
				<div class="cat-header">
					<div class="cat-left">
						<input
							type="color"
							bind:value={cat.color}
							onchange={handleSave}
							class="color-picker-input"
							title="Promijeni boju"
						/>
						<div class="cat-icon-badge" style:background-color={cat.color}>
							<Icon icon={cat.icon || 'mdi:trash-can'} height="1.2rem" />
						</div>

						<input
							type="text"
							class="cat-name-input"
							bind:value={cat.name}
							onchange={handleSave}
							placeholder="Naziv vrste otpada"
						/>
					</div>

					<div class="cat-right">
						<!-- NEXT COLLECTION BADGE -->
						<div
							class="countdown-pill"
							class:today={nextInfo.daysUntil === 0}
							class:soon={nextInfo.daysUntil === 1}
						>
							<Icon icon="mdi:calendar-clock" height="1rem" />
							<span>{nextInfo.formattedText} {nextInfo.formattedDate ? `(${nextInfo.formattedDate})` : ''}</span>
						</div>

						<button
							class="cat-btn-delete"
							type="button"
							title="Obriši vrstu"
							onclick={() => removeCategory(cat.id)}
						>
							<Icon icon="mdi:trash-can-outline" height="1.1rem" />
						</button>
					</div>
				</div>

				<!-- DATES CHIPS -->
				<div class="cat-dates-section">
					<div class="dates-chips-grid">
						{#if cat.dates.length === 0}
							<span class="no-dates">Nema unesenih datuma. Dodajte datume ispod.</span>
						{:else}
							{#each cat.dates as dStr}
								{@const isNext = dStr === nextInfo.nextDate}
								<div class="date-chip" class:is-next={isNext}>
									<span class="chip-text">{formatDateHR(dStr)}</span>
									{#if isNext}
										<span class="chip-next-tag">SLJEDEĆE</span>
									{/if}
									<button
										class="chip-remove"
										type="button"
										onclick={() => removeDateFromCategory(cat.id, dStr)}
										title="Ukloni datum"
									>
										×
									</button>
								</div>
							{/each}
						{/if}
					</div>

					<!-- ADD NEW DATE ROW -->
					<div class="add-date-controls">
						<div class="quick-add-group">
							<input
								type="date"
								class="date-input"
								bind:value={newDateInputs[cat.id]}
								placeholder="YYYY-MM-DD"
							/>
							<button
								type="button"
								class="btn-add-date"
								onclick={() => addDateToCategory(cat.id)}
							>
								<Icon icon="mdi:plus" /> Dodaj datum
							</button>
						</div>

						<div class="bulk-add-group">
							<input
								type="text"
								class="bulk-input"
								bind:value={bulkDateInputs[cat.id]}
								placeholder="Brzi unos: npr. 7.1., 21.1. ili 2026-01-07"
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										parseBulkDates(cat.id);
									}
								}}
							/>
							<button
								type="button"
								class="btn-bulk-add"
								onclick={() => parseBulkDates(cat.id)}
							>
								Uvezi
							</button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- BOTTOM SAVE BUTTON BAR -->
	<div class="bottom-bar">
		<button
			class="btn-save-main"
			type="button"
			disabled={saving}
			onclick={handleSave}
			use:Ripple={$ripple}
		>
			<Icon icon={saving ? 'mdi:loading' : 'mdi:content-save'} height="1.2rem" />
			<span>{saving ? 'Spremanje...' : 'Spremi promjene'}</span>
		</button>

		{#if saveSuccess}
			<span class="save-indicator success" transition:fade={{ duration: $motion }}>
				<Icon icon="mdi:check-circle" /> Sve promjene su uspješno spremljene!
			</span>
		{/if}
	</div>
</div>

<!-- AI MODAL -->
{#if showAiModal}
	<div class="modal-backdrop" onclick={() => (showAiModal = false)}>
		<div class="custom-modal" onclick={(e) => e.stopPropagation()}>
			<div class="custom-modal-header">
				<h3><Icon icon="mdi:auto-fix" /> Automatsko AI Izdvajanje iz slike kalendara</h3>
				<button class="close-btn" onclick={() => (showAiModal = false)}>×</button>
			</div>
			<div class="custom-modal-body">
				<p>
					AI Vision može pročitati sliku kalendara koju ste učitali, prepoznati boje kanti i izdvojiti sve datume za svaku vrstu otpada za cijelu godinu.
				</p>

				<div class="input-row">
					<label for="ai-provider-select">AI Pružatelj:</label>
					<select id="ai-provider-select" bind:value={aiProvider} class="modal-select">
						<option value="gemini">Google Gemini (Preporučeno, podržava Gemini 2.5 Flash)</option>
						<option value="openai">OpenAI (GPT-4o Vision)</option>
					</select>
				</div>

				<div class="input-row">
					<label for="ai-api-key-input">API Ključ:</label>
					<input
						id="ai-api-key-input"
						type="password"
						bind:value={aiApiKey}
						placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
						class="modal-input"
					/>
				</div>

				{#if aiMessage}
					<div class="ai-status-msg" class:error={aiMessage.includes('Greška')}>
						{aiMessage}
					</div>
				{/if}

				<div class="modal-actions">
					<button
						type="button"
						class="btn-action primary"
						disabled={aiLoading}
						onclick={runAiExtraction}
					>
						{aiLoading ? 'Analiziranje...' : 'Pokreni AI izdvajanje'}
					</button>
					<button type="button" class="btn-action outline" onclick={() => (showAiModal = false)}>
						Odustani
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- HOME ASSISTANT YAML MODAL -->
{#if showHaExportModal}
	<div class="modal-backdrop" onclick={() => (showHaExportModal = false)}>
		<div class="custom-modal large" onclick={(e) => e.stopPropagation()}>
			<div class="custom-modal-header">
				<h3><Icon icon="mdi:home-assistant" /> Home Assistant Senzori (YAML)</h3>
				<button class="close-btn" onclick={() => (showHaExportModal = false)}>×</button>
			</div>
			<div class="custom-modal-body">
				<p>
					Kopirajte ovaj kod u vaš Home Assistant <code>configuration.yaml</code> kako biste kreirali entitete za praćenje odvoza:
				</p>

				<pre class="yaml-code-box">{generateHomeAssistantYaml()}</pre>

				<div class="modal-actions">
					<button
						type="button"
						class="btn-action primary"
						onclick={() => {
							navigator.clipboard.writeText(generateHomeAssistantYaml());
							alert('Kopirano u međuspremnik!');
						}}
					>
						Kopiraj YAML
					</button>
					<button type="button" class="btn-action outline" onclick={() => (showHaExportModal = false)}>
						Zatvori
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- JSON IMPORT / EXPORT MODAL -->
{#if showJsonModal}
	<div class="modal-backdrop" onclick={() => (showJsonModal = false)}>
		<div class="custom-modal large" onclick={(e) => e.stopPropagation()}>
			<div class="custom-modal-header">
				<h3><Icon icon="mdi:code-json" /> Raspored u JSON formatu</h3>
				<button class="close-btn" onclick={() => (showJsonModal = false)}>×</button>
			</div>
			<div class="custom-modal-body">
				<textarea class="json-textarea" bind:value={jsonText}></textarea>
				<div class="modal-actions">
					<button
						type="button"
						class="btn-action primary"
						onclick={() => {
							try {
								const parsed = JSON.parse(jsonText);
								$wasteCollectionStore = parsed;
								handleSave();
								showJsonModal = false;
								alert('Raspored uspješno ažuriran iz JSON-a!');
							} catch (e: any) {
								alert(`Neispravan JSON: ${e.message}`);
							}
						}}
					>
						Primijeni i spremi
					</button>
					<button type="button" class="btn-action outline" onclick={() => (showJsonModal = false)}>
						Zatvori
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.waste-settings-root {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		padding-top: 0.5rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.header-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.8rem;
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-titles h2 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 600;
	}

	.subtitle {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.header-actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.btn-action {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 0.9rem;
		border-radius: 0.5rem;
		font-size: 0.88rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
		font-family: inherit;
	}

	.upload-btn {
		background: #2196f3;
		color: white;
	}

	.upload-btn:hover {
		background: #1976d2;
	}

	.btn-action.outline {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: white;
	}

	.btn-action.outline:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.8rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
	}

	.banner.success {
		background: rgba(0, 221, 23, 0.15);
		color: #00dd17;
		border: 1px solid rgba(0, 221, 23, 0.3);
	}

	.banner.error {
		background: rgba(244, 67, 54, 0.15);
		color: #f44336;
		border: 1px solid rgba(244, 67, 54, 0.3);
	}

	.banner.info {
		background: rgba(33, 150, 243, 0.15);
		color: #64b5f6;
		border: 1px solid rgba(33, 150, 243, 0.3);
	}

	.calendar-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 0.75rem;
	}

	.preview-toggle-button {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		background: transparent;
		border: none;
		color: #64b5f6;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0;
	}

	.preview-toggle-button:hover {
		text-decoration: underline;
	}

	.img-badge {
		font-size: 0.75rem;
		background: rgba(76, 175, 80, 0.2);
		color: #81c784;
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid rgba(76, 175, 80, 0.4);
	}

	.image-preview-panel {
		max-height: 450px;
		overflow-y: auto;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: #111;
		padding: 0.5rem;
		text-align: center;
	}

	.calendar-full-img {
		max-width: 100%;
		border-radius: 0.4rem;
		object-fit: contain;
	}

	.quick-tools-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.tool-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.6rem 0.95rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: white;
		font-size: 0.88rem;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
	}

	.tool-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.tool-btn.highlight {
		background: rgba(33, 150, 243, 0.15);
		border-color: #2196f3;
		color: #90caf9;
	}

	.tool-btn.highlight:hover {
		background: rgba(33, 150, 243, 0.25);
	}

	.categories-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title-row h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.btn-add-cat {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: white;
		border-radius: 0.4rem;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.category-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 4px solid var(--cat-color);
		border-radius: 0.7rem;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.cat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.cat-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 200px;
	}

	.color-picker-input {
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		background: transparent;
		padding: 0;
	}

	.cat-icon-badge {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.cat-name-input {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.3rem;
		padding: 0.35rem 0.5rem;
		color: white;
		font-size: 1.05rem;
		font-weight: 600;
		font-family: inherit;
		transition: border-color 0.2s;
	}

	.cat-name-input:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.3);
		background: rgba(0, 0, 0, 0.2);
	}

	.cat-right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.countdown-pill {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.85rem;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.countdown-pill.today {
		background: #ff5722;
		color: white;
		font-weight: 600;
	}

	.countdown-pill.soon {
		background: #ffb300;
		color: #222;
		font-weight: 600;
	}

	.cat-btn-delete {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 0.3rem;
		transition: color 0.2s;
	}

	.cat-btn-delete:hover {
		color: #f44336;
	}

	.dates-chips-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		max-height: 160px;
		overflow-y: auto;
		padding: 0.2rem 0;
	}

	.no-dates {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	.date-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.4rem;
		padding: 0.25rem 0.55rem;
		font-size: 0.85rem;
	}

	.date-chip.is-next {
		background: rgba(255, 255, 255, 0.15);
		border-color: var(--cat-color);
	}

	.chip-next-tag {
		font-size: 0.65rem;
		font-weight: 700;
		background: var(--cat-color);
		color: white;
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
	}

	.chip-remove {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		padding: 0 0.15rem;
	}

	.chip-remove:hover {
		color: #f44336;
	}

	.add-date-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.quick-add-group,
	.bulk-add-group {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.date-input,
	.bulk-input {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.4rem;
		padding: 0.35rem 0.6rem;
		color: white;
		font-size: 0.85rem;
		font-family: inherit;
	}

	.bulk-input {
		min-width: 230px;
	}

	.btn-add-date,
	.btn-bulk-add {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: white;
		border-radius: 0.4rem;
		padding: 0.35rem 0.65rem;
		font-size: 0.85rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.btn-add-date:hover,
	.btn-bulk-add:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.bottom-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1rem;
		margin-top: 0.5rem;
	}

	.btn-save-main {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #ffc107;
		color: #261700;
		font-weight: 600;
		padding: 0.65rem 1.4rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		font-size: 0.95rem;
		font-family: inherit;
		transition: opacity 0.2s;
	}

	.btn-save-main:hover {
		opacity: 0.9;
	}

	.save-indicator.success {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: #00dd17;
		font-size: 0.9rem;
	}

	/* MODALS */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		backdrop-filter: blur(4px);
	}

	.custom-modal {
		background: #232325;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.8rem;
		padding: 1.5rem;
		width: 90%;
		max-width: 520px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		color: white;
	}

	.custom-modal.large {
		max-width: 720px;
	}

	.custom-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.custom-modal-header h3 {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.15rem;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
	}

	.custom-modal-body {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.input-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.input-row label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.modal-select,
	.modal-input {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.4rem;
		padding: 0.55rem;
		color: white;
		font-size: 0.9rem;
		font-family: inherit;
	}

	.ai-status-msg {
		font-size: 0.88rem;
		padding: 0.5rem;
		border-radius: 0.4rem;
		background: rgba(33, 150, 243, 0.15);
		color: #90caf9;
	}

	.ai-status-msg.error {
		background: rgba(244, 67, 54, 0.15);
		color: #f44336;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.5rem;
	}

	.btn-action.primary {
		background: #2196f3;
		color: white;
	}

	.yaml-code-box,
	.json-textarea {
		background: #141416;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		padding: 1rem;
		font-family: monospace;
		font-size: 0.85rem;
		max-height: 350px;
		overflow-y: auto;
		color: #a5d6a7;
		white-space: pre-wrap;
	}

	.json-textarea {
		width: 100%;
		height: 300px;
		color: #fff;
		resize: vertical;
	}

	.format-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-left: 4px solid #2196f3;
		border-radius: 0.8rem;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.format-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.format-card-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.format-card-title h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.preview-badge {
		font-size: 0.85rem;
		background: rgba(33, 150, 243, 0.15);
		color: #90caf9;
		padding: 0.25rem 0.65rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(33, 150, 243, 0.3);
	}

	.format-card-desc {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.65);
		margin: 0;
		line-height: 1.4;
	}

	.format-card-desc code {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
		color: #64b5f6;
	}

	.format-inputs-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 0.75rem;
		margin-top: 0.3rem;
	}

	.input-col {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.input-col label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.settings-text-input {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.4rem;
		padding: 0.45rem 0.65rem;
		color: white;
		font-size: 0.88rem;
		font-family: inherit;
		transition: border-color 0.2s;
	}

	.settings-text-input:focus {
		outline: none;
		border-color: #2196f3;
	}

	@media (max-width: 768px) {
		.format-inputs-row {
			grid-template-columns: 1fr;
		}
	}
</style>
