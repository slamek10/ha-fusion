<script lang="ts">
	import Modal from '$lib/Modal/Index.svelte';
	import Icon from '@iconify/svelte';
	import {
		wasteCollectionStore,
		getNextCollection,
		formatDateHR,
		formatCroatianDays,
		formatCollectionCountdown,
		type WasteCategory
	} from '$lib/Stores/wasteCollection';
	import { timer } from '$lib/Stores';
	import { closeModal } from '$lib/Modals';

	let { sel, category }: { sel: any; category?: WasteCategory } = $props();

	let activeCategory = $derived(
		category ||
			$wasteCollectionStore?.categories?.find(
				(c) => c.id === sel?.category_id || c.name === sel?.name
			) ||
			$wasteCollectionStore?.categories?.[0]
	);

	let name = $derived(sel?.name || activeCategory?.name || 'Odvoz otpada');
	let icon = $derived(sel?.icon || activeCategory?.icon || 'mdi:trash-can');
	let color = $derived(sel?.color || activeCategory?.color || '#4CAF50');
	let dates = $derived(activeCategory?.dates || []);

	let format = $derived(sel?.format || $wasteCollectionStore?.default_format);
	let todayText = $derived(sel?.today_text || $wasteCollectionStore?.today_text);
	let tomorrowText = $derived(sel?.tomorrow_text || $wasteCollectionStore?.tomorrow_text);

	let nextInfo = $derived(
		getNextCollection(dates, $timer, {
			format,
			todayText,
			tomorrowText
		})
	);
	let showCalendarImage = $state(false);

	function calculateDaysFromNow(dStr: string) {
		const today = new Date($timer.getFullYear(), $timer.getMonth(), $timer.getDate());
		const [y, m, d] = dStr.split('-').map(Number);
		const target = new Date(y, m - 1, d);
		const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return diff;
	}
</script>

<Modal>
	{#snippet title()}
		<div class="modal-title-row">
			<div class="title-icon" style:background-color={color}>
				<Icon icon={icon} height="1.4rem" />
			</div>
			<h2>{name}</h2>
		</div>
	{/snippet}

	<div class="waste-modal-container">
		<!-- HERO COUNTDOWN -->
		<div class="hero-card" style:--accent-color={color}>
			<div class="hero-label">Sljedeći odvoz</div>
			{#if nextInfo.nextDate}
				<div class="hero-date">{nextInfo.formattedDate}</div>
				<div class="hero-countdown">{nextInfo.formattedText}</div>
			{:else}
				<div class="hero-countdown">Nema planiranih odvoza</div>
			{/if}
		</div>

		{#if $wasteCollectionStore?.has_calendar_image}
			<div class="calendar-preview-toggle">
				<button
					class="btn-toggle"
					type="button"
					onclick={() => (showCalendarImage = !showCalendarImage)}
				>
					<Icon icon={showCalendarImage ? 'mdi:eye-off' : 'mdi:calendar-month'} height="1.2rem" />
					<span>{showCalendarImage ? 'Sakrij kalendar' : 'Prikaži kalendar odvoza'}</span>
				</button>
			</div>

			{#if showCalendarImage}
				<div class="calendar-image-wrapper">
					<img
						src={$wasteCollectionStore.calendar_image || '/_api/waste_collection/image'}
						alt="Kalendar odvoza"
						class="calendar-img"
					/>
				</div>
			{/if}
		{/if}

		<!-- UPCOMING DATES LIST -->
		<div class="upcoming-header">
			<h3>Raspored odvoza ({dates.length} datuma u godini)</h3>
		</div>

		<div class="dates-list">
			{#if nextInfo.allUpcoming.length === 0}
				<div class="empty-state">Nema nadolazećih termina za ovu vrstu otpada.</div>
			{:else}
				{#each nextInfo.allUpcoming as dStr, i}
					{@const days = calculateDaysFromNow(dStr)}
					<div class="date-row" class:is-next={i === 0}>
						<div class="date-left">
							<span class="bullet" style:background-color={color}></span>
							<span class="date-text">{formatDateHR(dStr)}</span>
						</div>
						<span
							class="days-badge"
							class:today={days === 0}
							class:soon={days === 1}
							style:--accent-color={color}
						>
							{formatCollectionCountdown(days, dStr, { format, todayText, tomorrowText })}
						</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</Modal>

<style>
	.modal-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.title-icon {
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.waste-modal-container {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		padding-top: 0.5rem;
	}

	.hero-card {
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.08) 0%,
			rgba(255, 255, 255, 0.03) 100%
		);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-left: 5px solid var(--accent-color);
		border-radius: 0.8rem;
		padding: 1.2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.hero-label {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.6);
	}

	.hero-date {
		font-size: 1.8rem;
		font-weight: 700;
		color: white;
	}

	.hero-countdown {
		font-size: 1.15rem;
		font-weight: 500;
		color: var(--accent-color);
	}

	.calendar-preview-toggle {
		display: flex;
		justify-content: flex-end;
	}

	.btn-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.9rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: white;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.2s;
	}

	.btn-toggle:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.calendar-image-wrapper {
		max-height: 400px;
		overflow-y: auto;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: #111;
		text-align: center;
		padding: 0.5rem;
	}

	.calendar-img {
		max-width: 100%;
		border-radius: 0.4rem;
		object-fit: contain;
	}

	.upcoming-header h3 {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
		margin: 0;
	}

	.dates-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 280px;
		overflow-y: auto;
		padding-right: 0.3rem;
	}

	.date-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 0.9rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		transition: background 0.15s;
	}

	.date-row.is-next {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.date-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.bullet {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
	}

	.date-text {
		font-weight: 500;
		font-size: 0.95rem;
	}

	.days-badge {
		font-size: 0.85rem;
		padding: 0.25rem 0.6rem;
		border-radius: 0.4rem;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.85);
	}

	.days-badge.today {
		background: #ff5722;
		color: white;
		font-weight: 600;
	}

	.days-badge.soon {
		background: #ffb300;
		color: #222;
		font-weight: 600;
	}

	.empty-state {
		padding: 1.5rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
	}
</style>
