<script lang="ts">
	import { configuration, lang, ripple } from '$lib/Stores';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import { onMount } from 'svelte';

	let popupDir = $state($configuration?.popup_dir || '');
	let templateDir = $state($configuration?.template_dir || '');

	let popupsCount = $state<number | null>(null);
	let templatesCount = $state<number | null>(null);
	let activePopupPath = $state<string>('');
	let activeTemplatePath = $state<string>('');
	let checking = $state(false);

	async function testFolders() {
		checking = true;
		try {
			const popRes = await fetch(
				`/_api/popups${popupDir ? `?dir=${encodeURIComponent(popupDir)}` : ''}`
			);
			if (popRes.ok) {
				const json = await popRes.json();
				popupsCount = Array.isArray(json?.popups) ? json.popups.length : 0;
				activePopupPath = json?.dir || '';
			} else {
				popupsCount = 0;
			}

			const tplRes = await fetch(
				`/_api/button_templates${templateDir ? `?dir=${encodeURIComponent(templateDir)}` : ''}`
			);
			if (tplRes.ok) {
				const json = await tplRes.json();
				templatesCount = Array.isArray(json?.templates) ? json.templates.length : 0;
				activeTemplatePath = json?.dir || '';
			} else {
				templatesCount = 0;
			}
		} catch {
			popupsCount = 0;
			templatesCount = 0;
		} finally {
			checking = false;
		}
	}

	onMount(() => {
		testFolders();
	});

	function applyPreset(pDir: string, tDir: string) {
		popupDir = pDir;
		templateDir = tDir;
		$configuration.popup_dir = pDir;
		$configuration.template_dir = tDir;
		testFolders();
	}
</script>

<h2>Popups & templates folders</h2>

<div class="custom-folders-container">
	<div class="folder-group">
		<label for="popup_dir" class="label">
			<span>Popups folder path</span>
			{#if activePopupPath}
				<span class="active-badge" title="Resolved path">
					{popupsCount !== null ? `${popupsCount} popups found` : 'Searching...'}
				</span>
			{/if}
		</label>
		<div class="input-row">
			<input
				id="popup_dir"
				name="popup_dir"
				type="text"
				class="input"
				placeholder="data/popup or /Users/.../popups"
				bind:value={popupDir}
				onchange={() => testFolders()}
				autocomplete="off"
				spellcheck="false"
			/>
		</div>
		{#if activePopupPath}
			<span class="resolved-path">Active: {activePopupPath}</span>
		{/if}
	</div>

	<div class="folder-group">
		<label for="template_dir" class="label">
			<span>Templates folder path</span>
			{#if activeTemplatePath}
				<span class="active-badge" title="Resolved path">
					{templatesCount !== null ? `${templatesCount} templates found` : 'Searching...'}
				</span>
			{/if}
		</label>
		<div class="input-row">
			<input
				id="template_dir"
				name="template_dir"
				type="text"
				class="input"
				placeholder="data/button_card_templates"
				bind:value={templateDir}
				onchange={() => testFolders()}
				autocomplete="off"
				spellcheck="false"
			/>
		</div>
		{#if activeTemplatePath}
			<span class="resolved-path">Active: {activeTemplatePath}</span>
		{/if}
	</div>

	<div class="presets-row">
		<span class="preset-label">Presets:</span>
		<button
			type="button"
			class="preset-btn"
			use:Ripple={$ripple}
			onclick={() => applyPreset('data/popup', 'data/button_card_templates')}
		>
			./data/ (Local)
		</button>
		<button
			type="button"
			class="preset-btn"
			use:Ripple={$ripple}
			onclick={() =>
				applyPreset(
					'/Users/islamek/ha-habitat/configs/popups',
					'/Users/islamek/ha-habitat/configs/button_card_templates'
				)}
		>
			ha-habitat
		</button>
		<button
			type="button"
			class="preset-btn"
			use:Ripple={$ripple}
			onclick={() =>
				applyPreset(
					'/Volumes/config/popup',
					'/Volumes/config/button_card_templates'
				)}
		>
			HA Samba (/Volumes)
		</button>
		<button
			type="button"
			class="preset-btn"
			use:Ripple={$ripple}
			onclick={() => applyPreset('/config/popup', '/config/button_card_templates')}
		>
			/config (HA)
		</button>
		<button
			type="button"
			class="preset-btn refresh-btn"
			use:Ripple={$ripple}
			onclick={testFolders}
			title="Check folders"
		>
			<Icon icon="mdi:refresh" width="16" height="16" class={checking ? 'spin' : ''} />
		</button>
	</div>
</div>

<style>
	.custom-folders-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.folder-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.9rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.85);
	}

	.active-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		background: rgba(39, 174, 96, 0.2);
		color: #2ecc71;
		border: 1px solid rgba(39, 174, 96, 0.35);
		border-radius: 0.4rem;
	}

	.input-row {
		display: flex;
		gap: 0.5rem;
	}

	.resolved-path {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.presets-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding-top: 0.2rem;
	}

	.preset-label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.preset-btn {
		font-size: 0.75rem;
		padding: 0.3rem 0.65rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.85);
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.preset-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.25);
	}

	.refresh-btn {
		margin-left: auto;
		padding: 0.35rem 0.55rem;
	}

	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
