<script lang="ts">
	import { editMode, itemHeight, lang, ripple, timer, states } from '$lib/Stores';
	import Icon, { loadIcon } from '@iconify/svelte';
	import { openModal } from '$lib/Modals';
	import Ripple from '$lib/Actions/ripple';

	let { sel, sectionName = undefined }: { sel: any; sectionName?: string | undefined } = $props();

	let icon = $derived(sel?.icon || 'mdi:calendar-clock');
	let name = $derived(sel?.name || 'Days Since');
	let color = $derived(sel?.color || 'rgb(75, 166, 237)');
	let entity_id = $derived(sel?.entity_id);

	let entityState = $derived(entity_id ? $states?.[entity_id] : undefined);
	let last_reset = $derived(entityState?.state);

	let daysSince = $derived(calculateDaysSince(last_reset, $timer));

	function calculateDaysSince(lastReset: string | undefined, currentTime: Date): number {
		if (!lastReset) return 0;
		const resetDate = new Date(lastReset);
		const now = currentTime;
		const diffTime = Math.abs(now.getTime() - resetDate.getTime());
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}

	let image = $derived(icon?.includes('.'));

	function handleClick() {
		if ($editMode) {
			openModal(() => import('$lib/Modal/DaysSinceConfig.svelte'), {
				sel,
				sectionName
			});
		} else {
			// Open the modal for viewing/resetting
			openModal(() => import('$lib/Modal/DaysSinceModal.svelte'), {
				sel
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
					<Icon icon="mdi:calendar-clock" height="none" width="100%" />
				{:then resolvedIcon}
					<Icon icon={resolvedIcon} height="none" width="100%" />
				{:catch}
					<Icon icon="mdi:calendar-clock" height="none" width="100%" />
				{/await}
			{:else}
				<Icon icon="mdi:calendar-clock" height="none" width="100%" />
			{/if}
		</div>
	</div>

	<div class="right">
		<!-- NAME -->
		<div class="name">
			{name}
		</div>

		<!-- DAYS COUNT -->
		<div class="state">
			{#if daysSince === 0}
				{$lang('today') || 'Today'}
			{:else if daysSince === 1}
				1 {$lang('day') || 'day'}
			{:else}
				{daysSince} {$lang('days') || 'days'}
			{/if}
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

	/* Phone and Tablet (portrait) */
	@media all and (max-width: 768px) {
		.container {
			width: calc(50vw - 1.45rem);
		}
	}
</style>
