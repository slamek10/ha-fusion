<script lang="ts">
	import { lang, updateDashboard, states, entityList, ripple } from '$lib/Stores';
	import ConfigModal from '$lib/Modal/ConfigModal.svelte';
	import Select from '$lib/Components/Select.svelte';
	import CustomCard from '$lib/Main/CustomCard.svelte';
	import InputClear from '$lib/Components/InputClear.svelte';
	import Ripple from '$lib/Actions/ripple';
	import {
		customCardsStore,
		fetchCustomCards,
		type CustomCardMeta
	} from '$lib/Stores/customCards';
	import { onMount } from 'svelte';
	import * as yaml from 'js-yaml';

	let {
		isOpen,
		sel = $bindable(),
		sectionName = undefined
	}: {
		isOpen: boolean;
		sel: any;
		sectionName?: string;
	} = $props();

	onMount(() => {
		fetchCustomCards();
	});

	let card_type = $state(sel?.card_type || 'washing-machine-card');
	let shape = $state(sel?.shape || 'default');
	let col = $state<number | undefined>(sel?.col);
	let yamlText = $state(
		sel?.card_config ? yaml.dump(sel.card_config) : 'status_entity: binary_sensor.washing_in_progress\nappliance_type: washer\n'
	);
	let yamlError = $state('');

	let activeCardMeta = $derived<CustomCardMeta | undefined>(
		$customCardsStore.find(
			(c) =>
				c.tag === card_type ||
				c.id === card_type ||
				c.sub_cards?.some((s) => s.tag === card_type)
		)
	);

	let cardOptions = $derived(
		$customCardsStore.flatMap((c) => {
			if (c.sub_cards && c.sub_cards.length > 0) {
				return c.sub_cards.map((s) => ({
					id: s.tag,
					label: s.name,
					hint: c.name
				}));
			}
			return [
				{
					id: c.tag,
					label: c.name,
					hint: c.author ? `od ${c.author}` : undefined
				}
			];
		})
	);

	let domainForCard = $derived.by(() => {
		if (card_type.includes('light')) return 'light';
		if (card_type.includes('alarm')) return 'alarm_control_panel';
		if (card_type.includes('climate')) return 'climate';
		if (card_type.includes('cover')) return 'cover';
		if (card_type.includes('fan')) return 'fan';
		if (card_type.includes('person')) return 'person';
		if (card_type.includes('lock')) return 'lock';
		if (card_type.includes('media')) return 'media_player';
		if (card_type.includes('vacuum')) return 'vacuum';
		if (card_type.includes('humidifier')) return 'humidifier';
		return '';
	});

	let showAllEntities = $state(false);

	let entityOptions = $derived.by(() => {
		if (domainForCard && !showAllEntities) {
			const filtered = $entityList(domainForCard);
			if (filtered && filtered.length > 0) return filtered;
		}
		return $entityList('');
	});

	let allEntities = $derived($entityList(''));

	let selectedEntity = $state(sel?.card_config?.entity || '');

	function handleEntitySelect(val: string | undefined) {
		selectedEntity = val || '';
		try {
			let currentConfig: any = {};
			try {
				currentConfig = yaml.load(yamlText) || {};
			} catch {}

			currentConfig.type = `custom:${card_type}`;
			if (selectedEntity) {
				currentConfig.entity = selectedEntity;
			} else {
				delete currentConfig.entity;
			}

			yamlText = yaml.dump(currentConfig);
			yamlError = '';
			applyYamlToDashboard();
		} catch (e: any) {
			yamlError = e.message;
		}
	}

	// Quick form fields for washing-machine-card
	let applianceType = $state(sel?.card_config?.appliance_type || 'washer');
	let statusEntity = $state(sel?.card_config?.status_entity || '');
	let powerEntity = $state(sel?.card_config?.power_entity || '');
	let energyEntity = $state(sel?.card_config?.energy_entity || '');
	let themeOption = $state(sel?.card_config?.theme || 'auto');

	function updateYamlFromFields() {
		try {
			let currentConfig: any = {};
			try {
				currentConfig = yaml.load(yamlText) || {};
			} catch {}

			currentConfig.type = `custom:${card_type}`;
			if (applianceType) currentConfig.appliance_type = applianceType;
			if (statusEntity) currentConfig.status_entity = statusEntity;
			if (powerEntity) currentConfig.power_entity = powerEntity;
			if (energyEntity) currentConfig.energy_entity = energyEntity;
			if (themeOption) currentConfig.theme = themeOption;

			yamlText = yaml.dump(currentConfig);
			yamlError = '';
			applyYamlToDashboard();
		} catch (e: any) {
			yamlError = e.message;
		}
	}

	function handleYamlChange() {
		try {
			const parsed: any = yaml.load(yamlText);
			if (parsed && typeof parsed === 'object') {
				yamlError = '';
				if (parsed.entity !== undefined) selectedEntity = parsed.entity;
				if (parsed.appliance_type) applianceType = parsed.appliance_type;
				if (parsed.status_entity !== undefined) statusEntity = parsed.status_entity;
				if (parsed.power_entity !== undefined) powerEntity = parsed.power_entity;
				if (parsed.energy_entity !== undefined) energyEntity = parsed.energy_entity;
				if (parsed.theme) themeOption = parsed.theme;
				applyYamlToDashboard();
			}
		} catch (e: any) {
			yamlError = e.message;
		}
	}

	function applyYamlToDashboard() {
		try {
			const parsed: any = yaml.load(yamlText);
			sel = updateDashboard(sel, (live) => {
				live.card_type = card_type;
				live.card_file = activeCardMeta?.file || `${card_type}.js`;
				live.card_config = parsed;
				if (shape) live.shape = shape;
				if (col !== undefined && col !== null) live.col = col;
				else delete live.col;
			});
		} catch {}
	}

	function handleCardTypeSelect(val: string | undefined) {
		if (!val) return;
		card_type = val;
		const meta = $customCardsStore.find(
			(c) => c.tag === val || c.id === val || c.sub_cards?.some((s) => s.tag === val)
		);
		const subCard = meta?.sub_cards?.find((s) => s.tag === val);
		const defaultCfg = subCard?.default_config || meta?.default_config || { type: `custom:${val}` };
		yamlText = yaml.dump(defaultCfg);
		selectedEntity = defaultCfg.entity || '';
		applyYamlToDashboard();
	}
</script>

<ConfigModal {isOpen} bind:sel title="Prilagođena kartica">
	{#snippet children(set)}
		<h2>{$lang('preview') || 'Preview'}</h2>

		<div style:margin-bottom="1.2rem">
			<CustomCard {sel} {sectionName} preview={true} />
		</div>

		<h2>Vrsta prilagođene kartice</h2>
		<Select
			options={cardOptions.length > 0 ? cardOptions : [{ id: 'washing-machine-card', label: 'Washing Machine Animated Card' }]}
			placeholder="Odaberite karticu..."
			value={card_type}
			onchange={handleCardTypeSelect}
		/>

		<h2>{$lang('shape') || 'Veličina / oblik kartice'}</h2>
		<div class="button-container">
			<button
				type="button"
				class:selected={shape === 'default' || (!shape && shape !== 'square' && shape !== 'medium')}
				onclick={() => {
					shape = 'default';
					set('shape', 'default');
				}}
				use:Ripple={$ripple}
			>
				Standardna (1/3)
			</button>
			<button
				type="button"
				class:selected={shape === 'medium'}
				onclick={() => {
					shape = 'medium';
					set('shape', 'medium');
				}}
				use:Ripple={$ripple}
			>
				Srednja (2/3)
			</button>
			<button
				type="button"
				class:selected={shape === 'square'}
				onclick={() => {
					shape = 'square';
					set('shape', 'square');
				}}
				use:Ripple={$ripple}
			>
				Kvadrat (3/3)
			</button>
		</div>

		<h2>{$lang('col') || 'Pozicija stupca u sekciji'}</h2>
		<div class="button-container">
			<button
				type="button"
				class:selected={col === undefined || col === null}
				onclick={() => {
					col = undefined;
					set('col', undefined);
				}}
				use:Ripple={$ripple}
			>
				Automatski
			</button>
			<button
				type="button"
				class:selected={col === 1}
				onclick={() => {
					col = 1;
					set('col', 1);
				}}
				use:Ripple={$ripple}
			>
				Stupac 1
			</button>
			<button
				type="button"
				class:selected={col === 2}
				onclick={() => {
					col = 2;
					set('col', 2);
				}}
				use:Ripple={$ripple}
			>
				Stupac 2
			</button>
			<button
				type="button"
				class:selected={col === 3}
				onclick={() => {
					col = 3;
					set('col', 3);
				}}
				use:Ripple={$ripple}
			>
				Stupac 3
			</button>
			<button
				type="button"
				class:selected={col === 4}
				onclick={() => {
					col = 4;
					set('col', 4);
				}}
				use:Ripple={$ripple}
			>
				Stupac 4
			</button>
		</div>

		{#if card_type === 'washing-machine-card'}
			<h2>Postavke uređaja</h2>

			<div class="visual-form">
				<label class="form-row">
					<span>Vrsta uređaja:</span>
					<select
						class="form-select"
						bind:value={applianceType}
						onchange={updateYamlFromFields}
					>
						<option value="washer">Perilica rublja (Washer)</option>
						<option value="dryer">Sušilica rublja (Dryer)</option>
						<option value="dishwasher">Perilica posuđa (Dishwasher)</option>
						<option value="oven">Pećnica (Oven)</option>
						<option value="microwave">Mikrovalna pećnica (Microwave)</option>
					</select>
				</label>

				<label class="form-row">
					<span>Status entitet (Obavezno):</span>
					<Select
						options={allEntities}
						placeholder="Odaberite status entitet..."
						value={statusEntity}
						computeIcons={true}
						clearable={true}
						onchange={(v) => {
							statusEntity = v || '';
							updateYamlFromFields();
						}}
					/>
				</label>

				<label class="form-row">
					<span>Entitet snage / Power (W):</span>
					<Select
						options={allEntities}
						placeholder="Odaberite entitet snage..."
						value={powerEntity}
						computeIcons={true}
						clearable={true}
						onchange={(v) => {
							powerEntity = v || '';
							updateYamlFromFields();
						}}
					/>
				</label>

				<label class="form-row">
					<span>Entitet potrošnje / Energy (kWh):</span>
					<Select
						options={allEntities}
						placeholder="Odaberite entitet potrošnje..."
						value={energyEntity}
						computeIcons={true}
						clearable={true}
						onchange={(v) => {
							energyEntity = v || '';
							updateYamlFromFields();
						}}
					/>
				</label>

				<label class="form-row">
					<span>Tema kartice:</span>
					<select
						class="form-select"
						bind:value={themeOption}
						onchange={updateYamlFromFields}
					>
						<option value="auto">Automatski (Prati Home Assistant)</option>
						<option value="dark">Tamna (Dark)</option>
						<option value="light">Svijetla (Light)</option>
						<option value="ha">Tema sučelja (HA theme)</option>
					</select>
				</label>
			</div>
		{/if}

		{#if card_type !== 'washing-machine-card'}
			<div class="entity-section-header">
				<h2>{$lang('entity') || 'Entity'}</h2>
				{#if domainForCard}
					<button
						type="button"
						class="btn-toggle-filter"
						onclick={() => (showAllEntities = !showAllEntities)}
					>
						{showAllEntities ? `Samo ${domainForCard}` : 'Prikaži sve entitete'}
					</button>
				{/if}
			</div>

			<div style:margin-bottom="1.2rem">
				<Select
					options={entityOptions}
					placeholder="Odaberite entitet..."
					value={selectedEntity}
					computeIcons={true}
					clearable={true}
					onchange={handleEntitySelect}
				/>
			</div>
		{/if}

		<h2>YAML Konfiguracija kartice</h2>
		<p class="yaml-hint">
			Lovelace konfiguracija proslijeđena funkciji <code>setConfig()</code>:
		</p>

		<textarea
			class="yaml-editor"
			rows="8"
			bind:value={yamlText}
			oninput={handleYamlChange}
			spellcheck="false"
		></textarea>

		{#if yamlError}
			<div class="yaml-err">{yamlError}</div>
		{/if}
	{/snippet}
</ConfigModal>

<style>
	.visual-form {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.6rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.form-row span {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.form-select {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.4rem;
		padding: 0.5rem 0.7rem;
		color: white;
		font-size: 0.9rem;
		font-family: inherit;
	}

	.form-select:focus {
		outline: none;
		border-color: #2196f3;
	}

	.yaml-hint {
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0.2rem 0 0.5rem 0;
	}

	.yaml-hint code {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
		color: #90caf9;
	}

	.yaml-editor {
		width: 100%;
		font-family: monospace;
		background: #141416;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		padding: 0.8rem;
		color: #a5d6a7;
		font-size: 0.88rem;
		resize: vertical;
		line-height: 1.4;
		box-sizing: border-box;
	}

	.yaml-editor:focus {
		outline: none;
		border-color: #2196f3;
	}

	.yaml-err {
		margin-top: 0.4rem;
		font-size: 0.85rem;
		color: #f44336;
		background: rgba(244, 67, 54, 0.1);
		padding: 0.4rem 0.6rem;
		border-radius: 0.3rem;
	}

	.entity-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.8rem;
		margin-bottom: 0.3rem;
	}

	.entity-section-header h2 {
		margin: 0;
	}

	.btn-toggle-filter {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #90caf9;
		padding: 0.25rem 0.6rem;
		border-radius: 0.4rem;
		font-size: 0.78rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-toggle-filter:hover {
		background: rgba(255, 255, 255, 0.16);
	}
</style>
