<script lang="ts">
	import Modal from '$lib/Modal/Index.svelte';
	import { connection, states, ripple, onStates } from '$lib/Stores';
	import { getDomain } from '$lib/Utils';
	import { callService, type HassEntity } from 'home-assistant-js-websocket';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import ComputeIcon from '$lib/Components/ComputeIcon.svelte';
	import { onMount } from 'svelte';

	let {
		isOpen,
		file,
		data: initialData = undefined,
		sel = undefined
	}: {
		isOpen: boolean;
		file?: string;
		data?: any;
		sel?: any;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	// svelte-ignore state_referenced_locally
	let popupData = $state<any>(initialData);
	let activeButtons = $state<Record<string, boolean>>({});

	onMount(async () => {
		if (!popupData && file) {
			loading = true;
			try {
				const res = await fetch(`/_api/popups?file=${encodeURIComponent(file)}`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const json = await res.json();
				popupData = json?.data;
			} catch (err: any) {
				error = err?.message || 'Failed to load popup file';
			} finally {
				loading = false;
			}
		}
	});

	// Derive title and content
	let popupTitle = $derived(
		popupData?.data?.title ||
			popupData?.title ||
			file?.replace(/\.ya?ml$/, '').replace(/_/g, ' ') ||
			'Popup'
	);

	let content = $derived(popupData?.data?.content || popupData?.content);

	// Normalize cards
	function getCards(container: any): any[] {
		if (!container) return [];
		if (Array.isArray(container.cards)) return container.cards;
		if (Array.isArray(container)) return container;
		return [container];
	}

	async function handleCardAction(card: any, index: string | number) {
		const action = card?.tap_action || card?.hold_action;
		const actionType = action?.action || (card?.service ? 'call-service' : 'toggle');

		// Visual feedback
		activeButtons[String(index)] = true;
		setTimeout(() => {
			activeButtons[String(index)] = false;
		}, 600);

		if (actionType === 'call-service' || action?.service || card?.service) {
			const serviceName = action?.service || card?.service;
			if (!serviceName) return;

			const [domain, service] = serviceName.split('.');
			const serviceData = action?.data || action?.service_data || card?.data || {};

			try {
				await callService($connection, domain, service, serviceData);
			} catch (err) {
				console.error('Failed to call service:', err);
			}
		} else if (actionType === 'toggle' || (!actionType && card?.entity)) {
			const entityId = card?.entity;
			if (!entityId) return;

			const domain = getDomain(entityId);
			if (domain) {
				try {
					await callService($connection, domain, 'toggle', { entity_id: entityId });
				} catch (err) {
					console.error('Failed to toggle entity:', err);
				}
			}
		}
	}

	function isCardActive(card: any, index: string | number): boolean {
		if (activeButtons[String(index)]) return true;
		if (card?.entity) {
			const state = $states?.[card.entity]?.state?.toLowerCase();
			return state ? $onStates?.includes(state) : false;
		}
		return false;
	}
</script>

{#if isOpen}
	<Modal size="normal">
		{#snippet title()}
			<h1>{popupTitle}</h1>
		{/snippet}

		{#if loading}
			<div class="loader-wrap">
				<div class="spinner"></div>
			</div>
		{:else if error}
			<div class="error-box">
				<Icon icon="mdi:alert-circle-outline" width="28" height="28" />
				<p>{error}</p>
			</div>
		{:else if content}
			<div class="yaml-popup-content">
				<!-- Horizontal Stack -->
				{#if content.type === 'horizontal-stack' || (!content.type && Array.isArray(content.cards))}
					<div class="horizontal-stack">
						{#each getCards(content) as card, idx (idx)}
							{@render renderCard(card, `h-${idx}`)}
						{/each}
					</div>

				<!-- Vertical Stack -->
				{:else if content.type === 'vertical-stack'}
					<div class="vertical-stack">
						{#each getCards(content) as card, idx (idx)}
							{@render renderCard(card, `v-${idx}`)}
						{/each}
					</div>

				<!-- Grid -->
				{:else if content.type === 'grid'}
					<div
						class="grid-stack"
						style:grid-template-columns={`repeat(${content.columns || 2}, 1fr)`}
					>
						{#each getCards(content) as card, idx (idx)}
							{@render renderCard(card, `g-${idx}`)}
						{/each}
					</div>

				<!-- Entities List -->
				{:else if content.type === 'entities' && Array.isArray(content.entities)}
					<div class="entities-list">
						{#each content.entities as entItem, idx (idx)}
							{@const entityId = typeof entItem === 'string' ? entItem : entItem?.entity}
							{@const entState = $states?.[entityId]}
							<div class="entity-row">
								<div class="entity-icon">
									{#if entItem?.icon}
										<Icon icon={entItem.icon} width="24" height="24" />
									{:else if entState}
										<ComputeIcon entity_id={entityId} />
									{:else}
										<Icon icon="mdi:help-circle-outline" width="24" height="24" />
									{/if}
								</div>
								<div class="entity-info">
									<span class="entity-name">
										{entItem?.name || entState?.attributes?.friendly_name || entityId}
									</span>
									<span class="entity-state">{entState?.state || 'Unknown'}</span>
								</div>
								{#if entState}
									<button
										use:Ripple={$ripple}
										class="entity-toggle"
										class:active={$onStates?.includes(entState?.state?.toLowerCase())}
										onclick={() => handleCardAction({ entity: entityId, tap_action: { action: 'toggle' } }, `ent-${idx}`)}
									>
										{$onStates?.includes(entState?.state?.toLowerCase()) ? 'ON' : 'OFF'}
									</button>
								{/if}
							</div>
						{/each}
					</div>

				<!-- Single Card Fallback -->
				{:else}
					<div class="single-card-wrap">
						{@render renderCard(content, 'single')}
					</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<p>No content defined in popup</p>
			</div>
		{/if}
	</Modal>
{/if}

{#snippet renderCard(card: any, id: string)}
	{#if card?.type === 'button' || !card?.type}
		<button
			use:Ripple={$ripple}
			class="popup-card-btn"
			class:active={isCardActive(card, id)}
			onclick={() => handleCardAction(card, id)}
		>
			{#if card?.icon}
				<div class="popup-btn-icon">
					<Icon icon={card.icon} width="32" height="32" />
				</div>
			{:else if card?.entity}
				<div class="popup-btn-icon">
					<ComputeIcon entity_id={card.entity} />
				</div>
			{/if}

			{#if card?.show_name !== false && (card?.name || card?.entity)}
				<span class="popup-btn-name">
					{card.name || $states?.[card.entity]?.attributes?.friendly_name || card.entity}
				</span>
			{/if}
		</button>
	{:else if card?.type === 'horizontal-stack'}
		<div class="horizontal-stack">
			{#each getCards(card) as subCard, subIdx (subIdx)}
				{@render renderCard(subCard, `${id}-${subIdx}`)}
			{/each}
		</div>
	{:else if card?.type === 'vertical-stack'}
		<div class="vertical-stack">
			{#each getCards(card) as subCard, subIdx (subIdx)}
				{@render renderCard(subCard, `${id}-${subIdx}`)}
			{/each}
		</div>
	{:else}
		<div class="fallback-card">
			<span>{card?.name || card?.type || 'Card'}</span>
		</div>
	{/if}
{/snippet}

<style>
	.yaml-popup-content {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		padding: 0.5rem 0;
	}

	.horizontal-stack {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 1rem;
		width: 100%;
	}

	.vertical-stack {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		width: 100%;
	}

	.grid-stack {
		display: grid;
		gap: 1rem;
		width: 100%;
	}

	.popup-card-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 5.5rem;
		padding: 1.2rem 1rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		color: rgba(255, 255, 255, 0.85);
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		user-select: none;
	}

	.popup-card-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.15);
		transform: translateY(-2px);
	}

	.popup-card-btn:active {
		transform: scale(0.97);
	}

	.popup-card-btn.active {
		background: rgba(255, 255, 255, 0.9);
		color: #1a1a1a;
		border-color: rgba(255, 255, 255, 1);
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
	}

	.popup-card-btn.active .popup-btn-icon {
		color: #1a1a1a;
	}

	.popup-btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: inherit;
		transition: transform 0.2s ease;
	}

	.popup-btn-name {
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.entities-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 100%;
	}

	.entity-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.9rem 1.1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.entity-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.85;
	}

	.entity-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0.15rem;
	}

	.entity-name {
		font-size: 0.95rem;
		font-weight: 500;
	}

	.entity-state {
		font-size: 0.8rem;
		opacity: 0.6;
		text-transform: capitalize;
	}

	.entity-toggle {
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 0.6rem;
		padding: 0.4rem 0.9rem;
		color: white;
		font-weight: 600;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.entity-toggle.active {
		background: #27ae60;
		color: white;
	}

	.loader-wrap {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 8rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid rgba(255, 255, 255, 0.15);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-box {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(231, 76, 60, 0.15);
		border: 1px solid rgba(231, 76, 60, 0.3);
		border-radius: 0.8rem;
		color: #ff6b6b;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		opacity: 0.6;
	}
</style>
