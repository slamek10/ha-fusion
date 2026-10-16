<script lang="ts">
	import {
		states,
		connection,
		selectedLanguage,
		editMode,
		ripple
	} from '$lib/Stores';
	import { callService } from 'home-assistant-js-websocket';
	import { openModal } from '$lib/Modals';
	import Ripple from '$lib/Actions/ripple';
	import Icon from '@iconify/svelte';
	import {
		customCardsStore,
		fetchCustomCards,
		ensureCardLoaded,
		type CustomCardMeta
	} from '$lib/Stores/customCards';
	import { onMount, tick } from 'svelte';

	let {
		sel,
		sectionName = undefined,
		preview = false
	}: {
		sel: any;
		sectionName?: string | undefined;
		preview?: boolean;
	} = $props();

	let containerEl = $state<HTMLDivElement | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');

	// Non-reactive internal tracker variables (MUST NOT be $state to prevent infinite reactive loop)
	let cardElement: any = null;
	let prevTag = '';
	let prevFile = '';
	let prevConfigStr = '';

	let cardMeta = $derived<CustomCardMeta | undefined>(
		$customCardsStore.find(
			(c) =>
				c.tag === sel?.card_type ||
				c.file === sel?.card_file ||
				c.id === sel?.card_type ||
				c.id === sel?.id_card ||
				c.tag === sel?.card_type?.replace(/-bundle$/, '') ||
				c.sub_cards?.some((s) => s.tag === sel?.card_type)
		) || $customCardsStore[0]
	);

	let tagName = $derived(
		sel?.card_type || cardMeta?.tag || 'washing-machine-card'
	);
	let cardFile = $derived(
		sel?.card_file || cardMeta?.file || `${tagName}.js`
	);

	function buildHassMock() {
		const lang = $selectedLanguage || 'en';
		const statesMap = $states || {};

		const conn: any = {
			haVersion: '2026.4.0',
			connected: Boolean($connection),
			addEventListener: () => {},
			removeEventListener: () => {},
			subscribeEvents: async () => () => {},
			subscribeMessage: async () => () => {},
			sendMessagePromise: async () => ({})
		};

		if ($connection) {
			try {
				Object.assign(conn, $connection);
			} catch {}
		}

		return {
			states: statesMap,
			connection: conn,
			connected: Boolean($connection),
			language: lang,
			locale: {
				language: lang,
				number_format: 'language',
				time_format: 'language'
			},
			translationMetadata: {
				fragments: [],
				translations: {
					[lang]: { isRTL: false },
					en: { isRTL: false }
				}
			},
			config: {
				version: ($connection as any)?.haVersion || '2026.4.0',
				state: 'RUNNING',
				unit_system: {
					length: 'km',
					mass: 'kg',
					temperature: '°C',
					volume: 'L'
				},
				components: []
			},
			themes: {
				darkMode: true,
				default_theme: 'default',
				default_dark_theme: 'default',
				themes: {}
			},
			selectedTheme: null,
			user: {
				name: 'User',
				is_admin: true
			},
			entities: {},
			devices: {},
			areas: {},
			services: {},
			formatEntityName: (entityState: any, name?: string) => {
				if (typeof name === 'string' && name) return name;
				return entityState?.attributes?.friendly_name || entityState?.entity_id || '';
			},
			formatEntityState: (entityState: any, state?: string) => {
				if (state !== undefined) return state;
				return entityState?.state ?? '';
			},
			formatEntityAttributeName: (_entityState: any, attribute: string) => attribute,
			formatEntityAttributeValue: (entityState: any, attr: string) =>
				entityState?.attributes?.[attr] ?? '',
			formatEntityDate: (date: Date | string, format?: Intl.DateTimeFormatOptions) => {
				const d = typeof date === 'string' ? new Date(date) : date;
				return d.toLocaleDateString(lang, format);
			},
			formatEntityTime: (date: Date | string, format?: Intl.DateTimeFormatOptions) => {
				const d = typeof date === 'string' ? new Date(date) : date;
				return d.toLocaleTimeString(lang, format || { hour: '2-digit', minute: '2-digit' });
			},
			formatEntityDateTime: (date: Date | string, format?: Intl.DateTimeFormatOptions) => {
				const d = typeof date === 'string' ? new Date(date) : date;
				return d.toLocaleString(lang, format);
			},
			formatDate: (date: Date | string) => {
				const d = typeof date === 'string' ? new Date(date) : date;
				return d.toLocaleDateString(lang);
			},
			formatTime: (date: Date | string) => {
				const d = typeof date === 'string' ? new Date(date) : date;
				return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
			},
			formatDateTime: (date: Date | string) => {
				const d = typeof date === 'string' ? new Date(date) : date;
				return d.toLocaleString(lang);
			},
			formatNumber: (num: string | number, options?: Intl.NumberFormatOptions) => {
				const n = typeof num === 'string' ? Number(num) : num;
				if (isNaN(n)) return String(num);
				return new Intl.NumberFormat(lang, options).format(n);
			},
			localize: (key: string, ..._args: any[]) => {
				const last = key.split('.').pop() || key;
				if (last === 'unavailable') return 'Nedostupno';
				if (last === 'unknown') return 'Nepoznato';
				if (last === 'on') return 'Uključeno';
				if (last === 'off') return 'Isključeno';
				return last;
			},
			hassUrl: (path = '') => path,
			callWS: async (msg: any) => {
				if ($connection) {
					try {
						return await $connection.sendMessagePromise(msg);
					} catch (e) {
						console.error('WS call failed:', e);
					}
				}
				return null;
			},
			callService: async (domain: string, service: string, serviceData?: any, target?: any) => {
				if ($connection) {
					try {
						return await callService($connection, domain, service, serviceData, target);
					} catch (e) {
						console.error('Service call failed:', e);
					}
				}
			}
		};
	}

	async function initCard() {
		loading = true;
		errorMessage = '';
		prevTag = tagName;
		prevFile = cardFile;
		prevConfigStr = JSON.stringify(sel?.card_config || {});

		if ($customCardsStore.length === 0) {
			await fetchCustomCards();
		}

		const loaded = await ensureCardLoaded(cardFile, tagName);
		if (!loaded) {
			errorMessage = `Nije moguće učitati skriptu za karticu "${tagName}".`;
			loading = false;
			return;
		}

		await tick();

		if (!containerEl) {
			loading = false;
			return;
		}

		try {
			// Clear existing
			containerEl.innerHTML = '';

			const el: any = document.createElement(tagName);

			// Config
			const config = {
				...(cardMeta?.default_config || {}),
				...(sel?.card_config || {}),
				type: `custom:${tagName}`
			};

			// Pass hass FIRST (cards like mini-climate inspect this.hass during setConfig)
			el.hass = buildHassMock();

			// Fallback entity if required domain entity is missing in unconfigured state
			if (!config.entity) {
				const statesMap = $states || {};
				if (tagName.includes('climate')) {
					const firstClimate = Object.keys(statesMap).find((k) => k.startsWith('climate.'));
					config.entity = firstClimate || 'climate.thermostat';
				} else if (tagName.includes('light')) {
					const firstLight = Object.keys(statesMap).find((k) => k.startsWith('light.'));
					config.entity = firstLight || 'light.living_room';
				}
			}

			if (typeof el.setConfig === 'function') {
				try {
					el.setConfig(config);
				} catch (cfgErr) {
					console.warn('Card setConfig error, trying with dummy entity:', cfgErr);
					if (!config.entity) {
						config.entity = Object.keys($states || {})[0] || 'climate.thermostat';
						el.setConfig(config);
					} else {
						throw cfgErr;
					}
				}
			}

			// Listen to events
			el.addEventListener('hass-more-info', (event: CustomEvent) => {
				const entityId = event.detail?.entityId || event.detail?.entity_id;
				if (entityId) {
					openModal(() => import('$lib/Modal/SensorModal.svelte'), {
						sel: { entity_id: entityId }
					});
				}
			});

			el.addEventListener('hass-action', async (event: CustomEvent) => {
				const detail = event.detail;
				const config = detail?.config;
				const ent = config?.entity || sel?.card_config?.entity;
				if (!ent || !$connection) return;

				const actionType = detail?.action || 'tap';
				const actionDef = config?.[`${actionType}_action`] || { action: 'toggle' };

				if (actionDef.action === 'toggle' || (!actionDef.action && actionType === 'tap')) {
					const domain = ent.split('.')[0];
					try {
						await callService($connection, domain, 'toggle', { entity_id: ent });
					} catch (e) {
						console.error('Failed to toggle entity:', e);
					}
				} else if (actionDef.action === 'more-info') {
					openModal(() => import('$lib/Modal/SensorModal.svelte'), {
						sel: { entity_id: ent }
					});
				} else if (actionDef.action === 'call-service' && actionDef.service) {
					const [d, s] = actionDef.service.split('.');
					try {
						await callService($connection, d, s, {
							...(actionDef.service_data || actionDef.data || {}),
							entity_id: ent
						});
					} catch (e) {
						console.error('Failed to call service:', e);
					}
				}
			});

			containerEl.appendChild(el);
			cardElement = el;
		} catch (err: any) {
			console.error('Failed to instantiate custom card:', err);
			errorMessage = err?.message || 'Greška pri postavljanju kartice.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		initCard();
	});

	// Re-initialize if card type or file changed
	$effect(() => {
		const tag = tagName;
		const file = cardFile;
		if (prevTag && (tag !== prevTag || file !== prevFile)) {
			prevTag = tag;
			prevFile = file;
			initCard();
		}
	});

	// Reactively update hass when states change
	$effect(() => {
		const s = $states;
		if (cardElement && s) {
			try {
				cardElement.hass = buildHassMock();
			} catch (e) {
				console.error('Failed to update card hass:', e);
			}
		}
	});

	// Reactively update card config when sel.card_config changes
	$effect(() => {
		const cfgStr = JSON.stringify(sel?.card_config || {});
		if (cardElement && cfgStr !== prevConfigStr) {
			prevConfigStr = cfgStr;
			try {
				if (typeof cardElement.setConfig === 'function') {
					cardElement.setConfig({
						...(cardMeta?.default_config || {}),
						...(sel?.card_config || {}),
						type: `custom:${tagName}`
					});
				}
				cardElement.hass = buildHassMock();
			} catch (e) {
				console.error('Failed to update card config:', e);
			}
		}
	});

	function handleClick(event: MouseEvent) {
		if ($editMode) {
			event.stopPropagation();
			openModal(() => import('$lib/Modal/CustomCardConfig.svelte'), {
				sel,
				sectionName
			});
		}
	}
</script>

<div
	class="custom-card-wrapper"
	class:edit-mode={$editMode && !preview}
	onclick={preview ? undefined : handleClick}
	role={$editMode && !preview ? 'button' : undefined}
	tabindex={$editMode && !preview ? 0 : -1}
>
	{#if $editMode && !preview}
		<div class="edit-badge">
			<Icon icon="mdi:pencil" height="0.9rem" />
			<span>Uredi karticu</span>
		</div>
	{/if}

	{#if loading}
		<div class="card-loading">
			<Icon icon="mdi:loading" class="spin" height="1.8rem" />
			<span>Učitavanje kartice ({tagName})...</span>
		</div>
	{:else if errorMessage}
		<div class="card-error">
			<Icon icon="mdi:alert-circle" height="1.4rem" />
			<div class="error-details">
				<strong>Greška prilagođene kartice</strong>
				<span>{errorMessage}</span>
			</div>
			{#if $editMode}
				<button
					class="btn-fix-config"
					onclick={() =>
						openModal(() => import('$lib/Modal/CustomCardConfig.svelte'), { sel, sectionName })}
				>
					Konfiguriraj
				</button>
			{/if}
		</div>
	{/if}

	<div
		bind:this={containerEl}
		class="custom-card-container"
		style:display={loading || errorMessage ? 'none' : 'block'}
	></div>
</div>

<style>
	.custom-card-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
		border-radius: 0.65rem;
		overflow: hidden;
		transition: outline 0.15s ease;

		/* Home Assistant Lovelace compatibility variables */
		--ha-card-background: var(--theme-button-background-color-off, rgba(255, 255, 255, 0.05));
		--card-background-color: var(--ha-card-background);
		--ha-card-border-radius: 0.65rem;
		--ha-card-border-color: rgba(255, 255, 255, 0.08);
		--ha-card-border-width: 1px;
		--ha-card-box-shadow: none;
		--primary-text-color: rgba(255, 255, 255, 0.95);
		--secondary-text-color: rgba(255, 255, 255, 0.65);
		--disabled-text-color: rgba(255, 255, 255, 0.35);
		--divider-color: rgba(255, 255, 255, 0.1);
		--primary-color: #2196f3;
		--accent-color: #ff9800;
		--rgb-primary-text-color: 255, 255, 255;
		--rgb-secondary-text-color: 180, 180, 180;
		--rgb-primary-color: 33, 150, 243;
		--rgb-accent-color: 255, 152, 0;
		--state-icon-color: rgba(255, 255, 255, 0.85);
		--state-icon-active-color: #ffc107;
		--rgb-state-default-color: 255, 255, 255;
		--rgb-state-light-color: 255, 193, 7;
		--rgb-state-switch-color: 76, 175, 80;

		/* Mushroom specific variables */
		--mush-icon-size: 42px;
		--mush-icon-symbol-size: 24px;
		--mush-badge-icon-size: 16px;
		--mush-control-height: 42px;
		--mush-spacing: 12px;
		--card-primary-font-size: 14px;
		--card-secondary-font-size: 12px;
		--card-primary-font-weight: 500;
		--card-secondary-font-weight: 400;
		--card-primary-line-height: 20px;
		--card-secondary-line-height: 16px;
		--card-primary-color: var(--primary-text-color);
		--card-secondary-color: var(--secondary-text-color);
		--mush-rgb-state-light: 255, 193, 7;
		--mush-rgb-state-switch: 33, 150, 243;
		--mush-rgb-state-fan: 0, 188, 212;
		--mush-rgb-state-entity: 33, 150, 243;
		--mush-rgb-state-person: 76, 175, 80;

		/* Bubble Card specific variables */
		--bubble-border-radius: 14px;
		--bubble-icon-size: 38px;
		--bubble-button-background-color: var(--theme-button-background-color-off, rgba(255, 255, 255, 0.05));
	}

	.custom-card-wrapper.edit-mode {
		cursor: pointer;
		outline: 2px dashed rgba(255, 255, 255, 0.25);
	}

	.custom-card-wrapper.edit-mode:hover {
		outline-color: #2196f3;
	}

	.edit-badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 10;
		background: rgba(33, 150, 243, 0.85);
		color: white;
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		pointer-events: none;
		backdrop-filter: blur(4px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.custom-card-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.custom-card-container :global(> *) {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.custom-card-container :global(*) {
		box-sizing: border-box;
	}

	.card-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.5rem 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		min-height: 48px;
		height: 100%;
		box-sizing: border-box;
		background: var(--theme-button-background-color-off, rgba(255, 255, 255, 0.05));
		border-radius: 0.65rem;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.card-error {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.8rem;
		min-height: 48px;
		height: 100%;
		box-sizing: border-box;
		background: rgba(244, 67, 54, 0.12);
		border: 1px solid rgba(244, 67, 54, 0.3);
		border-radius: 0.65rem;
		color: #ef5350;
	}

	.error-details {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.85rem;
		flex: 1;
	}

	.btn-fix-config {
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		padding: 0.4rem 0.75rem;
		border-radius: 0.4rem;
		font-size: 0.85rem;
		cursor: pointer;
	}
</style>
