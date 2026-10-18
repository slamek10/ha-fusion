<script lang="ts">
	import { base } from '$app/paths';
	import { configuration, editMode, lang, motion, ripple, selectedLanguage } from '$lib/Stores';
	import { fade } from 'svelte/transition';
	import { modals, closeModal } from '$lib/Modals';
	import Modal from '$lib/Modal/Index.svelte';
	import Language from '$lib/Settings/Language.svelte';
	import Addons from '$lib/Settings/Addons.svelte';
	import Motion from '$lib/Settings/Motion.svelte';
	import Version from '$lib/Settings/Version.svelte';
	import Token from '$lib/Settings/Token.svelte';
	import CustomJs from '$lib/Settings/CustomJs.svelte';
	import CustomCss from '$lib/Settings/CustomCss.svelte';
	import CustomFolders from '$lib/Settings/CustomFolders.svelte';
	import Logout from '$lib/Settings/Logout.svelte';
	import Ripple from '$lib/Actions/ripple';
	import Icon from '@iconify/svelte';
	import WasteCollectionSettings from '$lib/Settings/WasteCollectionSettings.svelte';
	import CustomCardsSettings from '$lib/Settings/CustomCardsSettings.svelte';
	import BillsSettings from '$lib/Settings/BillsSettings.svelte';

	let {
		data,
		isOpen,
		languages
	}: {
		data: any;
		isOpen: boolean;
		languages: { id: string; label: string }[];
	} = $props();

	let activeTab: 'main' | 'waste' | 'cards' | 'bills' = $state('main');
	let formElement: HTMLFormElement = $state(undefined as any);
	let timeout: ReturnType<typeof setTimeout> | null;
	let responseCode: number | undefined = $state(undefined);

	/**
	 * Saves form data to /data/configuration.yaml
	 */
	async function handleSubmit() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}

		try {
			const formDataToObject = (formData: FormData) => {
				const object: Record<string, string | File> = {};
				formData.forEach((value, key) => (object[key] = value));
				return object;
			};

			const data = new FormData(formElement);
			const form = formDataToObject(data);

			const addons = {
				...(form.youtube && { youtube: form.youtube === 'true' }),
				...(form.maptiler && { maptiler: { apikey: form.maptiler } })
			};

			if (typeof form.maptiler === 'string') {
				$configuration.addons = $configuration.addons || {};
				$configuration.addons.maptiler = { apikey: form.maptiler };
			}

			const token = form.token || undefined;
			const custom_js = form.custom_js ? Boolean(form.custom_js === 'true') : undefined;
			const formMotion = form.motion ? Boolean(form.motion === 'true') : undefined;

			const json: any = {
				locale: $selectedLanguage
			};

			if (token) {
				json.token = token;
				$configuration.token = token as string;
			}

			const popup_dir =
				typeof form.popup_dir === 'string' && form.popup_dir.trim()
					? form.popup_dir.trim()
					: undefined;
			const template_dir =
				typeof form.template_dir === 'string' && form.template_dir.trim()
					? form.template_dir.trim()
					: undefined;

			if (popup_dir) {
				json.popup_dir = popup_dir;
				$configuration.popup_dir = popup_dir;
			}
			if (template_dir) {
				json.template_dir = template_dir;
				$configuration.template_dir = template_dir;
			}

			if (Object.keys(addons).length > 0) json.addons = addons;
			if (custom_js) json.custom_js = custom_js;

			if (!formMotion) {
				$motion = 0;
				json.motion = false;
			} else {
				$motion = 190;
			}

			const response = await fetch(`${base}/_api/save_config`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(json)
			});

			responseCode = response.status;

			if (response.ok) {
				timeout = setTimeout(() => {
					responseCode = undefined;
				}, 2500);
			}
		} catch (error) {
			console.error(error);
			responseCode = 500;
		}
	}

	/**
	 * Save keyboard shortcut when pressing cmd/ctrl + s
	 */
	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			if ($modals.length > 0 && !$editMode) {
				// don't open browser save dialog
				event.preventDefault();
				handleSubmit();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<Modal size={activeTab === 'waste' || activeTab === 'cards' || activeTab === 'bills' ? 'large' : undefined}>
		{#snippet title()}
			<div class="settings-header">
				<h1>{$lang('settings')}</h1>
				<div class="settings-tabs">
					<button
						type="button"
						class="settings-tab"
						class:active={activeTab === 'main'}
						onclick={() => (activeTab = 'main')}
						use:Ripple={$ripple}
					>
						<Icon icon="clarity:settings-solid" height="1.1rem" />
						<span>{$lang('main_settings') || 'Main settings'}</span>
					</button>
					<button
						type="button"
						class="settings-tab"
						class:active={activeTab === 'bills'}
						onclick={() => (activeTab = 'bills')}
						use:Ripple={$ripple}
					>
						<Icon icon="mdi:receipt-text" height="1.1rem" />
						<span>{$lang('bills') || 'Bills'}</span>
					</button>
					<button
						type="button"
						class="settings-tab"
						class:active={activeTab === 'waste'}
						onclick={() => (activeTab = 'waste')}
						use:Ripple={$ripple}
					>
						<Icon icon="mdi:trash-can" height="1.1rem" />
						<span>{$lang('waste_collection') || 'Waste collection'}</span>
					</button>
					<button
						type="button"
						class="settings-tab"
						class:active={activeTab === 'cards'}
						onclick={() => (activeTab = 'cards')}
						use:Ripple={$ripple}
					>
						<Icon icon="mdi:view-grid-plus" height="1.1rem" />
						<span>{$lang('custom_cards') || 'Custom cards'}</span>
					</button>
				</div>
			</div>
		{/snippet}

		{#if activeTab === 'main'}
			<form
				id="settings"
				name="settings"
				bind:this={formElement}
				onsubmit={(e) => e.preventDefault()}
			>
				<Language {languages} />

				<Token />

				<Addons {data} />

				<Version />

				<CustomJs />

				<CustomCss />

				<CustomFolders />

				<Motion />

				<Logout />

				<div class="buttons">
					<div class="save-container">
						<button
							class="action save"
							onclick={(e) => {
								e.preventDefault();
								handleSubmit();
							}}
							use:Ripple={{
								...$ripple,
								color: 'rgba(0, 0, 0, 0.35)'
							}}
						>
							{$lang('save')}
						</button>

						{#if responseCode === 200}
							<span class="res success" transition:fade={{ duration: $motion }}>
								{$lang('successfully_saved')}
							</span>
						{:else if responseCode}
							<span class="res error" transition:fade={{ duration: $motion }}>
								{$lang('error_save_yaml')?.replace('{error}', `[${String(responseCode)}]`)}
							</span>
						{/if}
					</div>

					<button
						class="action done"
						onclick={(e) => {
							e.preventDefault();
							closeModal();
						}}
						use:Ripple={$ripple}
					>
						{$lang('done')}
					</button>
				</div>
			</form>
		{:else if activeTab === 'waste'}
			<WasteCollectionSettings />
		{:else if activeTab === 'cards'}
			<CustomCardsSettings />
		{:else if activeTab === 'bills'}
			<BillsSettings />
		{/if}
	</Modal>
{/if}

<style>
	.settings-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.settings-header h1 {
		margin: 0;
		font-size: 1.4rem;
	}

	.settings-tabs {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(0, 0, 0, 0.25);
		padding: 0.25rem;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.settings-tab {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.85rem;
		border-radius: 0.45rem;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.88rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.settings-tab:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
	}

	.settings-tab.active {
		background: rgba(255, 255, 255, 0.15);
		color: white;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
	}

	.buttons {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin-top: 0.9rem;
		padding-top: 1.5rem;
		display: flex;
		justify-content: space-between;
	}

	.save {
		background-color: #ffc107;
		color: #3b0f10 !important;
		font-weight: 500;
	}

	.res {
		margin-left: 0.9rem;
		align-self: center;
	}

	.success {
		color: #00dd17;
	}

	.error {
		color: #f92626;
	}

	.save-container {
		display: flex;
		align-items: center;
	}
</style>
