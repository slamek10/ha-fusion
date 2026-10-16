<script lang="ts">
	// eventually merge with SidebarItemConfig.svelte...

	import { record, lang, motion, ripple, states, demo, updateDashboard } from '$lib/Stores';
	import { openModal, closeModal } from '$lib/Modals';
	import { onMount } from 'svelte';
	import InputClear from '$lib/Components/InputClear.svelte';
	import Modal from '$lib/Modal/Index.svelte';
	import {
		getCameraEntity,
		getSensorEntity,
		getMediaPlayerEntity
	} from '$lib/Modal/getRandomEntity';

	import Button from '$lib/Main/Button.svelte';
	import Camera from '$lib/Main/Camera.svelte';
	import ConditionalMedia from '$lib/Main/ConditionalMedia.svelte';
	import Empty from '$lib/Main/Empty.svelte';
	import Entities from '$lib/Main/Entities.svelte';
	import ConfigButtons from '$lib/Modal/ConfigButtons.svelte';
	import Ripple from '$lib/Actions/ripple';
	import PictureElements from '$lib/Main/PictureElements.svelte';
	import DaysSince from '$lib/Main/DaysSince.svelte';
	import WasteCollection from '$lib/Main/WasteCollection.svelte';
	import CustomCard from '$lib/Main/CustomCard.svelte';
	import SpotifyPlayer from '$lib/Main/SpotifyPlayer.svelte';
	import { customCardsStore, fetchCustomCards } from '$lib/Stores/customCards';
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';

	let { isOpen, sel }: { isOpen: boolean; sel: any } = $props();

	// `sel` is a plain prop, so it can't be reassigned after refreshDashboard()
	// re-creates the graph; keep the live item in reactive local state instead
	// svelte-ignore state_referenced_locally
	let selected = $state(sel);

	let searchString = $state('');
	let searchElement = $state<HTMLInputElement>();

	// get random preview entities
	if (!$demo.camera) $demo.camera = getCameraEntity($states);
	if (!$demo.sensor) $demo.sensor = getSensorEntity($states);
	if (!$demo.media_player) $demo.media_player = getMediaPlayerEntity($states);

	let loadIcons: (typeof import('@iconify/svelte'))['loadIcons'];
	let icons: Record<string, string>;

	onMount(async () => {
		fetchCustomCards();

		if (searchElement) {
			searchElement.focus();
		}

		// if changing type reset object
		if (selected) {
			selected = updateDashboard(selected, (live) => {
				Object.keys(live).forEach((key) => {
					if (key !== 'id') {
						delete live[key];
					}
				});
				live.type = 'configure';
			});
		}

		// picture elements config, need to be loaded before click but can be deferred to onmount
		const [iconifyModule, iconsModule] = await Promise.all([
			import('@iconify/svelte'),
			import('$lib/Modal/PictureElements/icons')
		]);

		loadIcons = iconifyModule.loadIcons;
		icons = iconsModule.icons;
	});

	interface ItemOption {
		id: string;
		type: string;
		component?: any;
		props?: any;
		style?: any;
	}

	interface ItemProviderGroup {
		id: string;
		name: string;
		author?: string;
		icon?: string;
		items: ItemOption[];
	}

	let standardItems = $derived<ItemOption[]>([
		{
			id: 'button',
			type: $lang('button'),
			component: Button,
			props: {
				demo: $demo.sensor,
				sel: selected
			}
		},
		{
			id: 'days_since',
			type: $lang('days_since') || 'Days Since',
			component: DaysSince,
			props: {
				sel: selected
			}
		},
		{
			id: 'waste_collection',
			type: $lang('waste_collection') || 'Waste Collection',
			component: WasteCollection,
			props: {
				sel: selected
			}
		},
		{
			id: 'spotify_player',
			type: $lang('spotify_player') || 'Spotify Player',
			component: SpotifyPlayer,
			props: {
				sel: selected
			}
		},
		{
			id: 'spotify_player_large',
			type: $lang('spotify_player_large') || 'Spotify Player Large',
			component: SpotifyPlayer,
			props: {
				sel: selected,
				large: true
			}
		},
		{
			id: 'entities',
			type: $lang('entities'),
			component: Entities,
			props: {
				demo: $demo.sensor,
				sel: selected
			}
		},
		{
			id: 'camera',
			type: $lang('camera'),
			component: Camera,
			props: {
				demo: $demo.camera,
				sel: selected,
				responsive: true,
				controls: false,
				muted: true
			}
		},
		{
			id: 'picture_elements',
			type: $lang('picture_elements'),
			component: PictureElements,
			props: {
				sel: selected
			}
		},
		{
			id: 'empty',
			type: $lang('empty'),
			component: Empty,
			props: {
				sel: selected
			}
		},
		{
			id: 'conditional_media',
			type: `${$lang('conditional')} ${$lang('media')?.toLocaleLowerCase()}`,
			component: ConditionalMedia,
			props: {
				demo: $demo.media_player,
				sel: selected
			}
		}
	]);

	let providerGroups = $derived.by<ItemProviderGroup[]>(() => {
		const groups: ItemProviderGroup[] = [];

		// 1. Original / Standard cards at the top
		groups.push({
			id: 'original',
			name: $lang('standard') || 'Izvorne kartice (Standard)',
			author: 'HA-Fusion',
			icon: 'clarity:applications-solid',
			items: standardItems
		});

		// 2. Custom cards below, grouped per provider / package
		if ($customCardsStore.length === 0) {
			groups.push({
				id: 'custom_cards_empty',
				name: $lang('custom_card') || 'Prilagođene kartice',
				author: 'Prilagođeno',
				icon: 'mdi:puzzle-outline',
				items: [
					{
						id: 'custom_card',
						type: $lang('custom_card') || 'Custom Card',
						component: CustomCard,
						props: {
							sel: selected,
							preview: true
						}
					}
				]
			});
		} else {
			for (const card of $customCardsStore) {
				const cardItems: ItemOption[] = [];

				if (card.sub_cards && card.sub_cards.length > 0) {
					for (const sub of card.sub_cards) {
						const subKey = sub.id || sub.tag;
						cardItems.push({
							id: `custom_card:${card.id}::${subKey}`,
							type: sub.name,
							component: CustomCard,
							props: {
								sel: {
									type: 'custom_card',
									card_type: sub.tag,
									card_file: card.file,
									card_config: sub.default_config || { type: `custom:${sub.tag}` }
								},
								preview: true
							}
						});
					}
				} else {
					cardItems.push({
						id: `custom_card:${card.tag}`,
						type: card.name,
						component: CustomCard,
						props: {
							sel: {
								type: 'custom_card',
								card_type: card.tag,
								card_file: card.file,
								card_config: card.default_config || { type: `custom:${card.tag}` }
							},
							preview: true
						}
					});
				}

				let icon = 'mdi:puzzle-outline';
				if (card.tag.includes('wash') || card.id.includes('wash')) {
					icon = 'mdi:washing-machine';
				} else if (card.tag.includes('mushroom') || card.id.includes('mushroom')) {
					icon = 'mdi:mushroom';
				}

				groups.push({
					id: card.id || card.tag,
					name: card.name,
					author: card.author || 'Custom',
					icon,
					items: cardItems
				});
			}
		}

		return groups;
	});

	let filteredGroups = $derived.by(() => {
		const q = searchString.trim().toLowerCase();
		if (!q) return providerGroups;

		return providerGroups
			.map((group) => {
				const matchesGroupMeta =
					group.name.toLowerCase().includes(q) ||
					(group.author && group.author.toLowerCase().includes(q));

				const matchedItems = group.items.filter((item) => {
					if (matchesGroupMeta) return true;
					return (
						item.id.toLowerCase().includes(q) ||
						item.type.toLowerCase().includes(q)
					);
				});

				return {
					...group,
					items: matchedItems
				};
			})
			.filter((group) => group.items.length > 0);
	});

	let collapsedGroups = $state<Record<string, boolean>>({});

	function toggleGroup(groupId: string) {
		collapsedGroups[groupId] = !collapsedGroups[groupId];
	}

	function isGroupOpen(groupId: string): boolean {
		if (searchString.trim().length > 0) return true;
		return !collapsedGroups[groupId];
	}

	let allCollapsed = $derived.by(() => {
		if (providerGroups.length === 0) return false;
		return providerGroups.every((g) => collapsedGroups[g.id]);
	});

	function toggleAllGroups() {
		const willCollapse = !allCollapsed;
		const next: Record<string, boolean> = {};
		for (const g of providerGroups) {
			next[g.id] = willCollapse;
		}
		collapsedGroups = next;
	}

	async function handleClick(id: string) {
		closeModal();

		if (id.startsWith('custom_card:')) {
			const raw = id.replace('custom_card:', '');
			const [cardId, subKey] = raw.includes('::') ? raw.split('::') : ['', raw];
			const card = cardId
				? $customCardsStore.find((c) => c.id === cardId)
				: $customCardsStore.find((c) => c.tag === raw || c.sub_cards?.some((s) => (s.id || s.tag) === raw));
			const sub = card?.sub_cards?.find((s) => (s.id || s.tag) === (subKey || raw));
			const targetTag = sub?.tag || card?.tag || raw;
			const defaultCfg = sub?.default_config || card?.default_config || { type: `custom:${targetTag}` };

			if (selected) {
				selected = updateDashboard(selected, (live) => {
					live.type = 'custom_card';
					live.card_type = targetTag;
					live.card_file = card?.file || `${targetTag}.js`;
					live.card_config = defaultCfg;
					live.name = sub?.name || card?.name || targetTag;
				});
			}
			$record();

			openModal(() => import('$lib/Modal/CustomCardConfig.svelte'), {
				sel: selected
			});
			return;
		}

		// set item type, then hand the re-linked live object to the next modal -
		// a stale ref would swallow all further edits
		if (selected && selected?.type) {
			selected = updateDashboard(selected, (live) => {
				live.type = id;
			});
		}
		$record();

		switch (selected?.type) {
			case 'button':
				openModal(() => import('$lib/Modal/ButtonConfig.svelte'), {
					demo: $demo.sensor,
					sel: selected
				});
				break;
			case 'days_since':
				openModal(() => import('$lib/Modal/DaysSinceConfig.svelte'), {
					sel: selected
				});
				break;
			case 'waste_collection':
				openModal(() => import('$lib/Modal/WasteCollectionConfig.svelte'), {
					sel: selected
				});
				break;
			case 'custom_card':
				openModal(() => import('$lib/Modal/CustomCardConfig.svelte'), {
					sel: selected
				});
				break;
			case 'spotify_player':
			case 'spotify_player_large':
				openModal(() => import('$lib/Modal/SpotifyPlayerConfig.svelte'), {
					sel: selected
				});
				break;
			case 'entities':
				openModal(() => import('$lib/Modal/EntitiesConfig.svelte'), {
					sel: selected
				});
				break;
			case 'camera':
				openModal(() => import('$lib/Modal/CameraConfig.svelte'), {
					demo: $demo.camera,
					sel: selected
				});
				break;
			case 'conditional_media':
				openModal(() => import('$lib/Modal/ConditionalMediaConfig.svelte'), {
					demo: $demo.media_player,
					sel: selected
				});
				break;
			case 'picture_elements': {
				loadIcons(Object.values(icons));

				openModal(() => import('$lib/Modal/PictureElements/PictureElementsConfig.svelte'), {
					sel: selected
				});

				break;
			}

			case 'empty':
				openModal(() => import('$lib/Modal/EmptyConfig.svelte'), { sel: selected });
				break;
			default:
				openModal(() => import('$lib/Modal/MainItemConfig.svelte'), { sel: selected });
		}
	}

	/**
	 * Handle keydown when pressing Esc key. Clear
	 * `searchElement` if focused else close modal
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		event.stopPropagation();

		if (searchElement === document.activeElement && searchString) {
			searchElement.blur();
			searchString = '';
		} else {
			closeModal();
		}
	}
</script>

<svelte:window onkeydowncapture={handleKeydown} />

{#if isOpen}
	<Modal size="large">
		{#snippet title()}<h1>{$lang('options')}</h1>{/snippet}

		<div class="search-bar">
			<div class="search-input-wrapper">
				<InputClear
					condition={searchString}
					onclear={() => {
						searchString = '';
					}}
				>
					{#snippet children(padding)}
						<input
							name={$lang('search')}
							class="input"
							type="text"
							placeholder={$lang('search')}
							autocomplete="off"
							spellcheck="false"
							bind:this={searchElement}
							bind:value={searchString}
							style:padding
						/>
					{/snippet}
				</InputClear>
			</div>

			{#if !searchString.trim() && providerGroups.length > 1}
				<button
					type="button"
					class="toggle-all-btn"
					onclick={toggleAllGroups}
					title={allCollapsed ? 'Prikaži sve grupe' : 'Sklopi sve grupe'}
				>
					<Icon
						icon={allCollapsed ? 'mdi:unfold-more-horizontal' : 'mdi:unfold-less-horizontal'}
						width="18"
						height="18"
					/>
					<span>{allCollapsed ? 'Prikaži sve' : 'Sklopi sve'}</span>
				</button>
			{/if}
		</div>

		<div class="groups-wrapper">
			{#if filteredGroups.length === 0}
				<div class="empty-results">
					<Icon icon="mdi:magnify-close" width="36" height="36" />
					<p>Nema rezultata za "{searchString}"</p>
				</div>
			{/if}

			{#each filteredGroups as group (group.id)}
				{@const open = isGroupOpen(group.id)}
				<div class="group-section">
					<button
						type="button"
						class="group-header"
						onclick={() => toggleGroup(group.id)}
						aria-expanded={open}
					>
						<div class="group-header-left">
							{#if group.icon}
								<Icon icon={group.icon} class="group-icon" width="22" height="22" />
							{/if}
							<span class="group-name">{group.name}</span>
							{#if group.author}
								<span class="group-author-badge">{group.author}</span>
							{/if}
						</div>

						<div class="group-header-right">
							<span class="group-badge">
								{group.items.length} {group.items.length === 1 ? 'kartica' : 'kartica'}
							</span>
							<div class="chevron-wrapper" class:rotated={!open}>
								<Icon icon="mdi:chevron-down" width="20" height="20" />
							</div>
						</div>
					</button>

					{#if open}
						<div class="items-grid" transition:slide={{ duration: $motion }}>
							{#each group.items as { id, type, component: Component, props, style } (id)}
								<button
									type="button"
									class="item-button"
									onclick={() => handleClick(id)}
									style:text-align={style?.['text-align'] || 'start'}
									use:Ripple={$ripple}
								>
									<div class="header">
										{type}
									</div>

									<div class="preview" class:camera={id === 'camera'} class:button={id === 'button'}>
										<Component {...props} />
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<ConfigButtons sel={selected} disableChangeType={true} />
	</Modal>
{/if}

<style>
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 1rem 0;
	}

	.search-input-wrapper {
		flex: 1;
	}

	.toggle-all-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.85);
		padding: 0.55rem 0.85rem;
		border-radius: 0.6rem;
		font-size: 0.82rem;
		cursor: pointer;
		font-family: inherit;
		white-space: nowrap;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.toggle-all-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.25);
	}

	.groups-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding-bottom: 1rem;
		min-height: 40vh;
	}

	.group-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.75rem;
		color: white;
		cursor: pointer;
		font-family: inherit;
		width: 100%;
		text-align: start;
		transition: background-color 0.15s ease, border-color 0.15s ease;
		user-select: none;
	}

	.group-header:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.25);
	}

	.group-header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	:global(.group-icon) {
		font-size: 1.35rem;
		color: #90caf9;
		flex-shrink: 0;
	}

	.group-name {
		font-weight: 600;
		font-size: 1.05rem;
		letter-spacing: -0.01em;
	}

	.group-author-badge {
		font-size: 0.75rem;
		background: rgba(144, 202, 249, 0.12);
		color: #90caf9;
		border: 1px solid rgba(144, 202, 249, 0.3);
		padding: 0.15rem 0.55rem;
		border-radius: 1rem;
		font-weight: 500;
	}

	.group-header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.group-badge {
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.75);
		padding: 0.2rem 0.6rem;
		border-radius: 0.5rem;
		font-weight: 500;
	}

	.chevron-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		color: rgba(255, 255, 255, 0.7);
	}

	.chevron-wrapper.rotated {
		transform: rotate(-90deg);
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		grid-gap: 1rem;
		align-content: start;
	}

	button.item-button {
		display: grid;
		padding: 0;
		font-family: inherit;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.8em;
		background-color: rgba(0, 0, 0, 0.2);
		height: 10rem;
		overflow: hidden;
		outline-offset: -2px;
		transition: border-color 0.2s ease, transform 0.15s ease;
	}

	button.item-button:hover {
		border-color: rgba(255, 255, 255, 0.4);
		transform: translateY(-2px);
	}

	.camera {
		padding: 1rem 1.2rem;
		height: inherit;
	}

	.button {
		display: flex;
		align-self: start;
		min-width: 14.5rem;
	}

	.header {
		background-color: rgba(0, 0, 0, 0.2);
		padding: 0.8em 1em 0.7em 1em;
		color: white;
		font-weight: 500;
		display: inline-flex;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		font-size: 1rem;
		height: min-content;
	}

	.preview {
		color: white;
		padding: 0 1.5rem;
		min-width: -webkit-fill-available;
	}

	.empty-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		color: rgba(255, 255, 255, 0.5);
		gap: 0.75rem;
		text-align: center;
	}
</style>
