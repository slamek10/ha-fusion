<script lang="ts">
	import { dashboard, motion, record, lang, ripple } from '$lib/Stores';
	import Ripple from '$lib/Actions/ripple';
	import Icon from '@iconify/svelte';
	import { generateId } from '$lib/Utils';

	let { onclicked = undefined, view }: { onclicked?: (() => void) | undefined; view: any } =
		$props();

	let noViews = $derived(!$dashboard?.views?.length);

	/**
	 * Creates a new full-width Bills section in current view
	 */
	function handleClick() {
		if (!view || !view.sections) return;

		// prepend bills section
		view.sections = [
			{
				type: 'bills',
				name: $lang('bills') || 'Kućni računi',
				id: generateId($dashboard)
			},
			...view.sections
		];

		// Deep clone to refresh all refs
		dashboard.update((d) => JSON.parse(JSON.stringify(d)));
		$record();
		onclicked?.();
	}
</script>

<button
	class="button dropdown"
	onclick={handleClick}
	use:Ripple={{
		...$ripple,
		opacity: noViews ? 0 : $ripple.opacity
	}}
	style:cursor={noViews ? 'unset' : 'pointer'}
	style:opacity={noViews ? '0.5' : '1'}
	style:transition="opacity {$motion}ms ease"
>
	<figure>
		<Icon icon="mdi:receipt-text" height="none" />
	</figure>

	{$lang('bills') || 'Računi'}
</button>

<style>
	figure {
		transform: scale(135%);
		transform-origin: center 0.64rem;
	}
</style>
