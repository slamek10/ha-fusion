<script lang="ts">
	import { lang, ripple, dashboard } from '$lib/Stores';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import {
		customCardsStore,
		fetchCustomCards,
		installCustomCard,
		deleteCustomCard,
		type CustomCardMeta
	} from '$lib/Stores/customCards';
	import { onMount } from 'svelte';

	let repoUrl = $state('');
	let installing = $state(false);
	let installError = $state('');
	let installSuccess = $state('');

	onMount(async () => {
		await fetchCustomCards(true);
	});

	async function handleInstall() {
		if (!repoUrl.trim()) {
			installError = 'Molimo unesite URL repozitorija ili .js datoteke.';
			return;
		}

		installing = true;
		installError = '';
		installSuccess = '';

		const result = await installCustomCard(repoUrl.trim());
		installing = false;

		if (result.ok && result.card) {
			installSuccess = `Kartica "${result.card.name}" je uspješno instalirana!`;
			repoUrl = '';
			setTimeout(() => {
				installSuccess = '';
			}, 4000);
		} else {
			installError = result.error || 'Instalacija nije uspjela.';
		}
	}

	async function handleDelete(card: CustomCardMeta) {
		if (confirm(`Jeste li sigurni da želite obrisati karticu "${card.name}"?`)) {
			await deleteCustomCard(card.id);
		}
	}

	function addCardToDashboard(card: CustomCardMeta) {
		if (!$dashboard.views || $dashboard.views.length === 0) return;
		const currentView = $dashboard.views[0];
		if (!currentView.sections) currentView.sections = [];
		if (currentView.sections.length === 0) {
			currentView.sections.push({ id: Date.now(), name: 'Kartice', items: [] });
		}
		const section = currentView.sections[0];
		if (!section.items) section.items = [];

		section.items.push({
			id: Date.now() + Math.floor(Math.random() * 10000),
			type: 'custom_card',
			card_type: card.tag,
			card_file: card.file,
			name: card.name,
			card_config: card.default_config || {
				type: `custom:${card.tag}`
			}
		} as any);

		$dashboard = $dashboard;
		alert(`Kartica "${card.name}" je dodana na radnu površinu!`);
	}
</script>

<div class="custom-cards-root">
	<!-- HEADER & INSTALL BOX -->
	<div class="install-card">
		<div class="install-header">
			<Icon icon="mdi:package-down" height="1.4rem" />
			<div class="install-titles">
				<h3>Instaliraj prilagođenu karticu</h3>
				<span class="sub">
					Unesite GitHub repozitorij (npr. <code>https://github.com/sionetta/wm_animated_ha_card</code>) ili direktni <code>.js</code> link.
				</span>
			</div>
		</div>

		<div class="install-input-row">
			<input
				type="text"
				class="input-repo"
				placeholder="https://github.com/..."
				bind:value={repoUrl}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						handleInstall();
					}
				}}
			/>
			<button
				class="btn-install"
				type="button"
				disabled={installing}
				onclick={handleInstall}
				use:Ripple={$ripple}
			>
				<Icon icon={installing ? 'mdi:loading' : 'mdi:download'} class={installing ? 'spin' : ''} />
				<span>{installing ? 'Preuzimanje...' : 'Instaliraj'}</span>
			</button>
		</div>

		{#if installSuccess}
			<div class="msg-banner success">
				<Icon icon="mdi:check-circle" /> {installSuccess}
			</div>
		{/if}

		{#if installError}
			<div class="msg-banner error">
				<Icon icon="mdi:alert-circle" /> {installError}
			</div>
		{/if}
	</div>

	<!-- INSTALLED CARDS LIST -->
	<div class="installed-section">
		<h3>Instalirane kartice ({$customCardsStore.length})</h3>

		{#if $customCardsStore.length === 0}
			<div class="empty-state">
				Nema instaliranih prilagođenih kartica. Unesite repozitorij iznad za instalaciju.
			</div>
		{:else}
			<div class="cards-grid">
				{#each $customCardsStore as card (card.id)}
					<div class="card-item">
						<div class="card-item-header">
							<div class="card-badge-icon">
								<Icon icon="mdi:view-dashboard-variant-outline" height="1.3rem" />
							</div>
							<div class="card-item-title-col">
								<h4>{card.name}</h4>
								<span class="card-tag"><code>&lt;{card.tag}&gt;</code></span>
							</div>

							<div class="card-item-actions">
								<button
									class="btn-action-small highlight"
									type="button"
									title="Dodaj na radnu površinu"
									onclick={() => addCardToDashboard(card)}
								>
									<Icon icon="mdi:plus-circle" height="1.1rem" />
									<span>Dodaj na ploču</span>
								</button>

								{#if card.url}
									<a
										class="btn-action-small"
										href={card.url}
										target="_blank"
										rel="noreferrer"
										title="Otvori GitHub repozitorij"
									>
										<Icon icon="mdi:github" height="1.1rem" />
									</a>
								{/if}

								<button
									class="btn-action-small danger"
									type="button"
									title="Obriši karticu"
									onclick={() => handleDelete(card)}
								>
									<Icon icon="mdi:trash-can-outline" height="1.1rem" />
								</button>
							</div>
						</div>

						{#if card.description}
							<p class="card-desc">{card.description}</p>
						{/if}

						<div class="card-footer-info">
							<span>Datoteka: <code>{card.file}</code></span>
							{#if card.author}
								<span>Autor: <strong>{card.author}</strong></span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.custom-cards-root {
		display: flex;
		flex-direction: column;
		gap: 1.4rem;
		padding-top: 0.5rem;
		color: white;
	}

	.install-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.8rem;
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.install-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.install-titles h3 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
	}

	.sub {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.65);
	}

	.sub code {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
		color: #90caf9;
	}

	.install-input-row {
		display: flex;
		gap: 0.6rem;
	}

	.input-repo {
		flex: 1;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		padding: 0.65rem 0.9rem;
		color: white;
		font-size: 0.92rem;
		font-family: inherit;
		transition: border-color 0.2s;
	}

	.input-repo:focus {
		outline: none;
		border-color: #2196f3;
	}

	.btn-install {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		background: #2196f3;
		border: none;
		border-radius: 0.5rem;
		color: white;
		padding: 0.65rem 1.2rem;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		font-family: inherit;
		transition: opacity 0.2s;
	}

	.btn-install:hover {
		opacity: 0.9;
	}

	.msg-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.9rem;
		border-radius: 0.4rem;
		font-size: 0.88rem;
	}

	.msg-banner.success {
		background: rgba(0, 221, 23, 0.15);
		color: #00dd17;
		border: 1px solid rgba(0, 221, 23, 0.3);
	}

	.msg-banner.error {
		background: rgba(244, 67, 54, 0.15);
		color: #f44336;
		border: 1px solid rgba(244, 67, 54, 0.3);
	}

	.installed-section h3 {
		margin: 0 0 0.8rem 0;
		font-size: 1.15rem;
		font-weight: 600;
	}

	.cards-grid {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.card-item {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 4px solid #2196f3;
		border-radius: 0.7rem;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.card-item-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.card-badge-icon {
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 0.5rem;
		background: rgba(33, 150, 243, 0.2);
		color: #90caf9;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-item-title-col {
		flex: 1;
		min-width: 180px;
	}

	.card-item-title-col h4 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.card-tag code {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.card-item-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-action-small {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		border-radius: 0.4rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: white;
		font-size: 0.82rem;
		cursor: pointer;
		text-decoration: none;
		font-family: inherit;
		transition: all 0.15s;
	}

	.btn-action-small:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.btn-action-small.highlight {
		background: rgba(33, 150, 243, 0.2);
		border-color: #2196f3;
		color: #90caf9;
	}

	.btn-action-small.highlight:hover {
		background: rgba(33, 150, 243, 0.35);
	}

	.btn-action-small.danger {
		color: rgba(255, 255, 255, 0.5);
	}

	.btn-action-small.danger:hover {
		color: #f44336;
		background: rgba(244, 67, 54, 0.15);
		border-color: rgba(244, 67, 54, 0.3);
	}

	.card-desc {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		line-height: 1.4;
	}

	.card-footer-info {
		display: flex;
		gap: 1.2rem;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.5);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		padding-top: 0.5rem;
	}

	.card-footer-info code {
		color: #a5d6a7;
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.6rem;
		border: 1px dashed rgba(255, 255, 255, 0.1);
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
</style>
