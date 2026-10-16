<script lang="ts">
	import { lang, ripple, updateDashboard } from '$lib/Stores';
	import WasteCollection from '$lib/Main/WasteCollection.svelte';
	import ConfigModal from '$lib/Modal/ConfigModal.svelte';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import InputClear from '$lib/Components/InputClear.svelte';
	import Select from '$lib/Components/Select.svelte';
	import { openModal } from '$lib/Modals';
	import { updateObj } from '$lib/Utils';
	import { wasteCollectionStore, fetchWasteCollection } from '$lib/Stores/wasteCollection';
	import { onMount } from 'svelte';

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
		fetchWasteCollection();
	});

	let category_id: string | undefined = $state(
		sel?.category_id || $wasteCollectionStore?.categories?.[0]?.id || 'bio'
	);
	let name: string | undefined = $state(sel?.name);
	let icon: string | undefined = $state(sel?.icon);
	let color: string | undefined = $state(sel?.color);
	let format: string | undefined = $state(sel?.format);
	let today_text: string | undefined = $state(sel?.today_text);
	let tomorrow_text: string | undefined = $state(sel?.tomorrow_text);

	let categoryOptions = $derived(
		($wasteCollectionStore?.categories || []).map((cat) => ({
			id: cat.id,
			label: cat.name,
			icon: cat.icon
		}))
	);

	function handleCategoryChange(selectedId: string | undefined) {
		category_id = selectedId;
		const found = $wasteCollectionStore?.categories?.find((c) => c.id === selectedId);
		sel = updateDashboard(sel, (live) => {
			live.category_id = selectedId;
			if (found) {
				if (!name) live.name = found.name;
				if (!icon) live.icon = found.icon;
				if (!color) live.color = found.color;
				name = live.name;
				icon = live.icon;
				color = live.color;
			}
		});
	}

	function handleColorChange(newColor: string | undefined) {
		color = newColor;
		sel = updateDashboard(sel, (live) => {
			updateObj(live, 'color', { target: { value: newColor } });
		});
	}

	function handleFormatChange(newFormat: string | undefined) {
		format = newFormat;
		sel = updateDashboard(sel, (live) => {
			live.format = newFormat ? newFormat.trim() : undefined;
		});
	}

	function handleTodayTextChange(val: string | undefined) {
		today_text = val;
		sel = updateDashboard(sel, (live) => {
			live.today_text = val ? val.trim() : undefined;
		});
	}

	function handleTomorrowTextChange(val: string | undefined) {
		tomorrow_text = val;
		sel = updateDashboard(sel, (live) => {
			live.tomorrow_text = val ? val.trim() : undefined;
		});
	}
</script>

<ConfigModal {isOpen} bind:sel title="Odvoz otpada">
	{#snippet children(set)}
		<h2>{$lang('preview') || 'Preview'}</h2>

		<div style:pointer-events="none" style:margin-bottom="1rem">
			<WasteCollection {sel} {sectionName} />
		</div>

		<h2>Kategorija otpada</h2>
		<Select
			options={categoryOptions}
			placeholder="Odaberite vrstu otpada..."
			value={category_id}
			onchange={handleCategoryChange}
		/>

		<h2>{$lang('name') || 'Name'}</h2>

		<InputClear
			condition={name}
			onclear={() => {
				name = undefined;
				set('name');
			}}
		>
			{#snippet children(padding)}
				<input
					name={$lang('name')}
					class="input"
					type="text"
					placeholder="Naziv odvoza (npr. Bio otpad)"
					autocomplete="off"
					spellcheck="false"
					bind:value={name}
					onchange={(event) => set('name', event)}
					style:padding
				/>
			{/snippet}
		</InputClear>

		<h2>{$lang('icon') || 'Icon'}</h2>

		<div class="icon-gallery-container">
			<InputClear
				condition={icon}
				onclear={() => {
					icon = undefined;
					set('icon');
				}}
			>
				{#snippet children(padding)}
					<input
						name={$lang('icon')}
						class="input"
						type="text"
						placeholder="mdi:trash-can"
						autocomplete="off"
						spellcheck="false"
						bind:value={icon}
						onchange={(event) => set('icon', event)}
						style:padding
					/>
				{/snippet}
			</InputClear>

			<button
				class="icon-gallery-button"
				type="button"
				title="Pregledaj ikone na Iconify"
				onclick={() => {
					window.open('https://icon-sets.iconify.design/', '_blank');
				}}
				use:Ripple={$ripple}
			>
				<Icon icon="majesticons:open-line" height="1.1rem" />
			</button>
		</div>

		<h2>{$lang('color') || 'Color'}</h2>

		<div class="color-options">
			{#each ['#8D6E63', '#4CAF50', '#FBC02D', '#1E88E5', '#90A4AE', '#2E7D32', '#E53935', '#6D4C41'] as presetColor}
				<button
					type="button"
					class="color-circle"
					class:selected={color === presetColor}
					style:background-color={presetColor}
					onclick={() => handleColorChange(presetColor)}
				></button>
			{/each}
			<InputClear
				condition={color}
				onclear={() => {
					color = undefined;
					handleColorChange(undefined);
				}}
			>
				{#snippet children(padding)}
					<input
						name="color"
						class="input"
						type="text"
						placeholder="#4CAF50"
						bind:value={color}
						onchange={(e) => handleColorChange((e.target as HTMLInputElement).value)}
						style:padding
						style:max-width="8rem"
					/>
				{/snippet}
			</InputClear>
		</div>

		<h2>Format teksta (Prikaz dana)</h2>

		<p class="format-hint">
			Prilagodite tekst koji se prikazuje na gumbu. Koristite <code>&#123;days&#125;</code> za broj dana i <code>&#123;date&#125;</code> za datum.
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
					class:active={format === preset}
					onclick={() => handleFormatChange(preset)}
				>
					{preset}
				</button>
			{/each}
		</div>

		<InputClear
			condition={format}
			onclear={() => handleFormatChange(undefined)}
		>
			{#snippet children(padding)}
				<input
					name="format"
					class="input"
					type="text"
					placeholder={'Zadano: Sljedeće za {days} dana'}
					autocomplete="off"
					spellcheck="false"
					bind:value={format}
					oninput={(e) => handleFormatChange((e.target as HTMLInputElement).value)}
					style:padding
				/>
			{/snippet}
		</InputClear>

		<div class="secondary-inputs-grid">
			<div>
				<span class="sub-label">Tekst za danas:</span>
				<InputClear
					condition={today_text}
					onclear={() => handleTodayTextChange(undefined)}
				>
					{#snippet children(padding)}
						<input
							name="today_text"
							class="input"
							type="text"
							placeholder="Danas"
							autocomplete="off"
							bind:value={today_text}
							oninput={(e) => handleTodayTextChange((e.target as HTMLInputElement).value)}
							style:padding
						/>
					{/snippet}
				</InputClear>
			</div>

			<div>
				<span class="sub-label">Tekst za sutra (opcionalno):</span>
				<InputClear
					condition={tomorrow_text}
					onclear={() => handleTomorrowTextChange(undefined)}
				>
					{#snippet children(padding)}
						<input
							name="tomorrow_text"
							class="input"
							type="text"
							placeholder="npr. Sljedeće za 1 dan ili Sutra"
							autocomplete="off"
							bind:value={tomorrow_text}
							oninput={(e) => handleTomorrowTextChange((e.target as HTMLInputElement).value)}
							style:padding
						/>
					{/snippet}
				</InputClear>
			</div>
		</div>
	{/snippet}
</ConfigModal>

<style>
	.icon-gallery-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	.icon-gallery-button {
		position: absolute;
		right: 0.5rem;
		height: 2.2rem;
		width: 2.2rem;
		border-radius: 0.4rem;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.icon-gallery-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.color-options {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
	}

	.color-circle {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		transition: transform 0.15s ease, border-color 0.15s ease;
	}

	.color-circle:hover {
		transform: scale(1.15);
	}

	.color-circle.selected {
		border-color: white;
		box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.5);
		transform: scale(1.1);
	}

	.format-hint {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0.2rem 0 0.6rem 0;
		line-height: 1.4;
	}

	.format-hint code {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
		color: #90caf9;
	}

	.preset-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}

	.btn-preset {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.35rem;
		padding: 0.3rem 0.6rem;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}

	.btn-preset:hover {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}

	.btn-preset.active {
		background: #2196f3;
		border-color: #2196f3;
		color: white;
	}

	.secondary-inputs-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
		margin-top: 0.6rem;
	}

	.sub-label {
		display: block;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.3rem;
	}
</style>
