<script lang="ts">
	import { editMode, itemHeight, lang, ripple, timer } from '$lib/Stores';
	import Icon, { loadIcon } from '@iconify/svelte';
	import { openModal } from '$lib/Modals';
	import Ripple from '$lib/Actions/ripple';
	import {
		wasteCollectionStore,
		fetchWasteCollection,
		getNextCollection,
		type WasteCategory
	} from '$lib/Stores/wasteCollection';
	import { onMount } from 'svelte';

	let { sel, sectionName = undefined }: { sel: any; sectionName?: string | undefined } = $props();

	onMount(() => {
		fetchWasteCollection();
	});

	// Find the matched category from wasteCollectionStore
	let category = $derived<WasteCategory | undefined>(
		$wasteCollectionStore?.categories?.find(
			(c) => c.id === sel?.category_id || c.name?.toLowerCase() === sel?.name?.toLowerCase()
		) || $wasteCollectionStore?.categories?.[0]
	);

	let name = $derived(sel?.name || category?.name || 'Odvoz otpada');
	let icon = $derived(sel?.icon || category?.icon || 'mdi:trash-can');
	let color = $derived(sel?.color || category?.color || '#4CAF50');
	let dates = $derived(category?.dates || []);
	let format = $derived(sel?.format || $wasteCollectionStore?.default_format);
	let todayText = $derived(sel?.today_text || $wasteCollectionStore?.today_text);
	let tomorrowText = $derived(sel?.tomorrow_text || $wasteCollectionStore?.tomorrow_text);

	let collectionInfo = $derived(
		getNextCollection(dates, $timer, {
			format,
			todayText,
			tomorrowText
		})
	);
	let stateText = $derived(collectionInfo.formattedText);

	let image = $derived(icon?.includes('.'));

	function handleClick() {
		if ($editMode) {
			openModal(() => import('$lib/Modal/WasteCollectionConfig.svelte'), {
				sel,
				sectionName
			});
		} else {
			openModal(() => import('$lib/Modal/WasteCollectionModal.svelte'), {
				sel,
				category
			});
		}
	}
</script>

<div
	class="container"
	tabindex="-1"
	style:cursor={!$editMode ? 'pointer' : ''}
	style:min-height="{$itemHeight}px"
	onclick={handleClick}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	}}
	role="button"
	use:Ripple={$ripple}
>
	<!-- ICON -->
	<div class="left">
		<div
			class="icon"
			style:--icon-color={color}
			style:background-color={color}
			style:background-image={image && icon ? `url(${icon})` : 'none'}
			class:image
		>
			{#if image}
				&nbsp;
			{:else if icon}
				{#await loadIcon(icon)}
					<Icon icon="mdi:trash-can" height="none" width="100%" />
				{:then resolvedIcon}
					<Icon icon={resolvedIcon} height="none" width="100%" />
				{:catch}
					<Icon icon="mdi:trash-can" height="none" width="100%" />
				{/await}
			{:else}
				<Icon icon="mdi:trash-can" height="none" width="100%" />
			{/if}
		</div>
	</div>

	<div class="right">
		<!-- NAME -->
		<div class="name">
			{name}
		</div>

		<!-- DAYS UNTIL COUNT -->
		<div
			class="state"
			class:today={collectionInfo.daysUntil === 0}
			class:soon={collectionInfo.daysUntil === 1}
		>
			{stateText}
		</div>
	</div>
</div>

<style>
	.container {
		background-color: var(--theme-button-background-color-off);
		font-family: inherit;
		width: 100%;
		height: 100%;
		display: grid;
		border-radius: 0.55rem;
		margin: 0;
		grid-template-columns: min-content auto;
		grid-auto-flow: row;
		grid-template-areas: 'left right';
		--container-padding: 0.45rem;

		/* fix ripple */
		transform: translateZ(0);
		overflow: hidden;
		container-type: inline-size;
	}

	.image {
		background-size: cover;
		background-repeat: no-repeat;
	}

	.left {
		display: inherit;
		padding: var(--container-padding);
	}

	.right {
		display: flex;
		flex-direction: column;
		justify-content: center;
		overflow: hidden;
		padding-right: var(--container-padding);
		min-width: 0;
	}

	.icon {
		--icon-size: 1.95rem;
		height: var(--icon-size);
		width: var(--icon-size);
		color: white;
		background-color: rgba(0, 0, 0, 0.25);
		border-radius: 50%;
		display: grid;
		align-items: center;
		display: flex;
		padding: 0.32rem;
		background-position: center center;
		background-size: cover;
		background-repeat: no-repeat;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
	}

	.name {
		font-weight: 500;
		color: var(--theme-button-name-color-off);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 0.85rem;
		margin-top: -1px;
	}

	.state {
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--theme-button-state-color-off);
		font-size: 0.78rem;
		margin-top: 1px;
	}

	@container (max-width: 145px) {
		.container {
			--container-padding: 0.35rem;
		}
		.icon {
			--icon-size: 1.65rem;
			padding: 0.24rem;
		}
		.name {
			font-size: 0.78rem;
		}
		.state {
			font-size: 0.70rem;
		}
	}

	.state.today {
		color: #ff5722;
		font-weight: 600;
	}

	.state.soon {
		color: #ffb300;
		font-weight: 500;
	}

	/* Phone and Tablet (portrait) */
	@media all and (max-width: 768px) {
		.container {
			width: calc(50vw - 1.45rem);
		}
	}
</style>
