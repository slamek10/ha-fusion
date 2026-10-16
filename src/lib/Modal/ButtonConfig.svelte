<script lang="ts">
	import {
		states,
		lang,
		ripple,
		templates,
		entityList,
		updateDashboard,
		configuration
	} from '$lib/Stores';
	import Button from '$lib/Main/Button.svelte';
	import Select from '$lib/Components/Select.svelte';
	import ConfigModal from '$lib/Modal/ConfigModal.svelte';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import InputClear from '$lib/Components/InputClear.svelte';
	import {
		updateObj,
		getDomain,
		getName,
		getTogglableService,
		isDisplayOnlyDomain
	} from '$lib/Utils';
	import type { ButtonItem } from '$lib/Types';
	import { openModal } from '$lib/Modals';
	import * as parser from 'js-yaml';

	let {
		isOpen,
		sel = $bindable(),
		demo = undefined,
		sectionName = undefined
	}: {
		isOpen: boolean;
		sel: ButtonItem;
		demo?: string | undefined;
		sectionName?: string | undefined;
	} = $props();

	let entity_id = $derived(sel?.entity_id);
	let name = $state(sel?.name);
	let color = $state(sel?.color);
	let icon = $state(sel?.icon);
	let stateOverride = $state(sel?.state);
	let computedIcon = $state<string>();
	let displayOnly = $state(sel?.displayOnly ?? isDisplayOnlyDomain(sel?.entity_id));
	let slideBrightness = $state(sel?.slide_brightness !== false);
	let sliderUpdates = $state(sel?.slider_updates === 'release' ? 'release' : 'continuous');

	// Popup / Modal & Template options
	let popupAction = $state<'default' | 'yaml' | 'none'>(
		sel?.popup_action || (sel?.more_info === false ? 'none' : 'default')
	);
	let popupFile = $state(sel?.popup_file || '');
	let popupTrigger = $state<'click' | 'hold'>(sel?.popup_trigger || 'click');
	let showCircle = $state(sel?.show_circle || false);
	let buttonTemplate = $state(sel?.button_template || '');
	let buttonTemplates = $state<string[]>(
		Array.isArray(sel?.button_templates)
			? [...sel.button_templates]
			: sel?.button_template
				? [sel.button_template]
				: []
	);
	let shape = $state<'default' | 'medium' | 'square'>(sel?.shape || 'default');
	let col = $state<number | undefined>(sel?.col);
	let stateDisplay = $state<string>(sel?.state_display || '');
	let availablePopups = $state<{ file: string; name: string; title: string }[]>([]);
	let availableTemplates = $state<{ file: string; name: string; keys: string[] }[]>([]);
	let customPopupDir = $state($configuration?.popup_dir || '');
	let customTemplateDir = $state($configuration?.template_dir || '');
	let activePopupDir = $state('');
	let showFolderConfig = $state(false);

	let allTemplateKeys = $derived.by(() => {
		const items: { id: string; label: string }[] = [];
		const seen = new Set<string>();

		for (const t of availableTemplates) {
			if (Array.isArray(t.keys)) {
				for (const k of t.keys) {
					if (!seen.has(k)) {
						seen.add(k);
						items.push({
							id: k,
							label: `${k} (${t.file})`
						});
					}
				}
			}
			if (!seen.has(t.name)) {
				seen.add(t.name);
				items.push({
					id: t.name,
					label: `${t.name} (${t.file})`
				});
			}
		}
		return items.sort((a, b) => a.id.localeCompare(b.id));
	});

	function toggleTemplate(key: string, setFn: (k: string, v?: any) => void) {
		if (buttonTemplates.includes(key)) {
			buttonTemplates = buttonTemplates.filter((k) => k !== key);
		} else {
			buttonTemplates = [...buttonTemplates, key];
			if (key === 'circle' || key === 'light') {
				showCircle = true;
				setFn('show_circle', true);
			}
		}
		setFn('button_templates', buttonTemplates.length > 0 ? buttonTemplates : undefined);
		setFn('button_template', buttonTemplates[0] || undefined);
	}

	function addTemplate(key: string, setFn: (k: string, v?: any) => void) {
		if (!key || buttonTemplates.includes(key)) return;
		buttonTemplates = [...buttonTemplates, key];
		setFn('button_templates', buttonTemplates);
		setFn('button_template', buttonTemplates[0]);
		if (key === 'circle' || key === 'light') {
			showCircle = true;
			setFn('show_circle', true);
		}
	}

	function removeTemplate(key: string, setFn: (k: string, v?: any) => void) {
		buttonTemplates = buttonTemplates.filter((k) => k !== key);
		setFn('button_templates', buttonTemplates.length > 0 ? buttonTemplates : undefined);
		setFn('button_template', buttonTemplates[0] || undefined);
	}

	function loadPopups(dir?: string) {
		const target = dir || customPopupDir || $configuration?.popup_dir;
		const url = `/_api/popups${target ? `?dir=${encodeURIComponent(target)}` : ''}`;
		fetch(url)
			.then((r) => (r.ok ? r.json() : {}))
			.then((data: any) => {
				if (Array.isArray(data?.popups)) {
					availablePopups = data.popups;
					activePopupDir = data.dir || '';
				} else if (Array.isArray(data)) {
					availablePopups = data;
				}
			})
			.catch(() => {});
	}

	function loadTemplates(dir?: string) {
		const target = dir || customTemplateDir || $configuration?.template_dir;
		const url = `/_api/button_templates${target ? `?dir=${encodeURIComponent(target)}` : ''}`;
		fetch(url)
			.then((r) => (r.ok ? r.json() : {}))
			.then((data: any) => {
				if (Array.isArray(data?.templates)) {
					availableTemplates = data.templates;
				} else if (Array.isArray(data)) {
					availableTemplates = data;
				}
			})
			.catch(() => {});
	}

	$effect(() => {
		loadPopups(customPopupDir || $configuration?.popup_dir);
		loadTemplates(customTemplateDir || $configuration?.template_dir);
	});

	let options = $derived($entityList(''));

	let template = $derived($templates?.[sel?.id]);

	let servicePlaceholder = $state<string>();

	$effect(() => {
		if (entity_id || template?.service?.output) updateServicePlaceholder();
	});

	function updateServicePlaceholder() {
		try {
			// parse the `template.service`
			if (template?.service?.output) {
				const parsed = parser.load(template.service.output) as {
					service: string;
					data: Record<string, any>;
				};
				servicePlaceholder = parsed?.service || $lang('none');
			} else {
				// toggleService
				const service = getTogglableService($states?.[sel?.entity_id]);
				servicePlaceholder = service || $lang('none');
			}
		} catch {
			// error
			servicePlaceholder = $lang('error');
		}
	}

	let suggestDisplayOnly = $derived(isDisplayOnlyDomain(entity_id));
	let isLightEntity = $derived(getDomain(entity_id) === 'light');
	let isCoverEntity = $derived(getDomain(entity_id) === 'cover');
	let isVacuumEntity = $derived(getDomain(entity_id) === 'vacuum');

	let hideBattery = $state(sel?.hide_battery || false);
	let showStatusOnButton = $state(sel?.show_status_on_button || false);
	let vacuumPlans = $state<string[]>(sel?.vacuum_plans || []);
	let vacuumRooms = $state<{ id: string; name: string }[]>(sel?.vacuum_rooms || []);
	let mopIntensityEntity = $state(sel?.vacuum_mop_intensity_entity || '');

	let newPlanEntity = $state('');
	let newRoomId = $state('');
	let newRoomName = $state('');

	function addPlan() {
		if (!newPlanEntity) return;
		vacuumPlans = [...vacuumPlans, newPlanEntity];
		sel = updateDashboard(sel, (live) => updateObj(live, 'vacuum_plans', vacuumPlans));
		newPlanEntity = '';
	}

	function removePlan(index: number) {
		vacuumPlans = vacuumPlans.filter((_, i) => i !== index);
		sel = updateDashboard(sel, (live) =>
			updateObj(live, 'vacuum_plans', vacuumPlans.length ? vacuumPlans : undefined)
		);
	}

	function addRoom() {
		if (!newRoomId || !newRoomName) return;
		vacuumRooms = [...vacuumRooms, { id: newRoomId, name: newRoomName }];
		sel = updateDashboard(sel, (live) => updateObj(live, 'vacuum_rooms', vacuumRooms));
		newRoomId = '';
		newRoomName = '';
	}

	function removeRoom(index: number) {
		vacuumRooms = vacuumRooms.filter((_, i) => i !== index);
		sel = updateDashboard(sel, (live) =>
			updateObj(live, 'vacuum_rooms', vacuumRooms.length ? vacuumRooms : undefined)
		);
	}
</script>

<ConfigModal {isOpen} bind:sel title={$lang('button')} {demo}>
	{#snippet children(set)}
		<h2>{$lang('preview')}</h2>

		<div style:pointer-events="none">
			<Button {sel} {sectionName} {displayOnly} />
		</div>

		<h2>{$lang('entity')}</h2>

		<div style="display: flex; gap: 0.8rem;">
			<div class="full-width">
				<Select
					{options}
					placeholder={$lang('entity')}
					value={entity_id}
					onchange={(event) => {
						if (event === null) return;
						set('entity_id', event);
						// Re-sync display-only with the new entity's default
						displayOnly = isDisplayOnlyDomain(event);
						set('displayOnly');
					}}
					computeIcons={true}
					getIconString={true}
					oniconString={(value) => {
						computedIcon = value;
					}}
				/>
			</div>

			<button
				use:Ripple={$ripple}
				title={$lang('template')}
				class="icon-gallery"
				onclick={() => {
					if (!sel?.id) return;
					openModal(() => import('$lib/Modal/Templater.svelte'), {
						sel,
						type: 'set_state'
					});
				}}
				style:padding="0.85rem"
				class:template-active={template?.set_state?.output}
			>
				<Icon icon="ph:brackets-curly-bold" height="none" />
			</button>
		</div>

		<h2>Button layout / shape</h2>
		<div class="button-container">
			<button
				class:selected={shape === 'default' || (!shape && shape !== 'square' && shape !== 'medium')}
				onclick={() => {
					shape = 'default';
					set('shape', 'default');
				}}
				use:Ripple={$ripple}
			>
				Standard (1/3)
			</button>
			<button
				class:selected={shape === 'medium'}
				onclick={() => {
					shape = 'medium';
					set('shape', 'medium');
				}}
				use:Ripple={$ripple}
			>
				Medium (2/3)
			</button>
			<button
				class:selected={shape === 'square'}
				onclick={() => {
					shape = 'square';
					set('shape', 'square');
				}}
				use:Ripple={$ripple}
			>
				Square (Full)
			</button>
		</div>

		<h2>Column position in section</h2>
		<div class="button-container">
			<button
				class:selected={col === undefined || col === null}
				onclick={() => {
					col = undefined;
					set('col', undefined);
				}}
				use:Ripple={$ripple}
			>
				Auto
			</button>
			<button
				class:selected={col === 1}
				onclick={() => {
					col = 1;
					set('col', 1);
				}}
				use:Ripple={$ripple}
			>
				Col 1
			</button>
			<button
				class:selected={col === 2}
				onclick={() => {
					col = 2;
					set('col', 2);
				}}
				use:Ripple={$ripple}
			>
				Col 2
			</button>
			<button
				class:selected={col === 3}
				onclick={() => {
					col = 3;
					set('col', 3);
				}}
				use:Ripple={$ripple}
			>
				Col 3
			</button>
			<button
				class:selected={col === 4}
				onclick={() => {
					col = 4;
					set('col', 4);
				}}
				use:Ripple={$ripple}
			>
				Col 4
			</button>
		</div>

		<h2>Button templates (custom:button-card)</h2>
		<p style="font-size: 0.82rem; color: rgba(255, 255, 255, 0.6); margin: -0.4rem 0 0.6rem 0;">
			Specify one or more templates (e.g. <code>light</code>, <code>icon_hue</code>).
		</p>

		{#if buttonTemplates.length > 0}
			<div class="active-templates-container">
				{#each buttonTemplates as t}
					<span class="template-chip">
						{t}
						<button
							type="button"
							class="chip-remove"
							onclick={() => removeTemplate(t, set)}
							title="Remove template"
						>
							&times;
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<div class="button-container">
			{#if isLightEntity}
				<button
					class:selected={buttonTemplates.includes('light')}
					onclick={() => toggleTemplate('light', set)}
					use:Ripple={$ripple}
				>
					light
				</button>
				<button
					class:selected={buttonTemplates.includes('icon_hue')}
					onclick={() => toggleTemplate('icon_hue', set)}
					use:Ripple={$ripple}
				>
					icon_hue
				</button>
			{/if}
			<button
				class:selected={buttonTemplates.includes('base')}
				onclick={() => toggleTemplate('base', set)}
				use:Ripple={$ripple}
			>
				base
			</button>
			<button
				class:selected={buttonTemplates.includes('circle') || showCircle}
				onclick={() => toggleTemplate('circle', set)}
				use:Ripple={$ripple}
			>
				circle
			</button>
		</div>

		{#if allTemplateKeys.length > 0}
			<div class="full-width" style="margin-top: 0.8rem;">
				<Select
					options={[
						{ id: '', label: '+ Add template from HA folder...' },
						...allTemplateKeys.map((item) => ({
							id: item.id,
							label: buttonTemplates.includes(item.id) ? `✓ ${item.label}` : item.label
						}))
					]}
					placeholder="+ Add template from HA folder..."
					value=""
					onchange={(val) => {
						if (val) addTemplate(val, set);
					}}
				/>
			</div>
		{/if}

		<h2>State display (custom expression)</h2>
		<p style="font-size: 0.82rem; color: rgba(255, 255, 255, 0.6); margin: -0.4rem 0 0.6rem 0;">
			Custom label or template (e.g. <code>[[[ if (variables.state === 'on') return 'Upaljeno'; return 'Ugašeno'; ]]]</code>)
		</p>
		<textarea
			class="input"
			rows="3"
			style="width: 100%; font-family: monospace; font-size: 0.85rem; resize: vertical; box-sizing: border-box; line-height: 1.4; padding: 0.6rem;"
			placeholder="[[[ if (variables.state === 'on') return 'Upaljeno'; ... ]]]"
			bind:value={stateDisplay}
			oninput={(e) => {
				const val = (e.target as HTMLTextAreaElement).value;
				set('state_display', val.trim() ? val : undefined);
			}}
		></textarea>

		<h2>{$lang('name')}</h2>

		<div class="icon-gallery-container">
			<InputClear
				condition={name}
				onclear={() => {
					name = undefined;
					set('name');
				}}
			>
				{#snippet children(padding)}
					<input
						name={$lang('name')}
						class="input"
						type="text"
						placeholder={template?.name?.output ||
							getName(sel, (entity_id && $states?.[entity_id]) || undefined) ||
							$lang('name')}
						autocomplete="off"
						spellcheck="false"
						bind:value={name}
						onchange={(event) => set('name', event)}
						style:padding
						disabled={Boolean(template?.name?.output)}
						class:disabled={Boolean(template?.name?.output)}
					/>
				{/snippet}
			</InputClear>

			<button
				use:Ripple={$ripple}
				title={$lang('template')}
				class="icon-gallery"
				onclick={async () => {
					if (!sel?.id) return;
					openModal(() => import('$lib/Modal/Templater.svelte'), {
						sel,
						type: 'name'
					});
				}}
				style:padding="0.85rem"
				class:template-active={template?.name?.output}
			>
				<Icon icon="ph:brackets-curly-bold" height="none" /></button
			>
		</div>

		<h2>{$lang('state')}</h2>

		<div class="icon-gallery-container">
			<InputClear
				condition={stateOverride}
				onclear={() => {
					stateOverride = undefined;
					set('state');
				}}
			>
				{#snippet children(padding)}
					<input
						name={$lang('state')}
						class="input"
						type="text"
						placeholder={template?.state?.output ||
							(entity_id && $states?.[entity_id]?.state) ||
							$lang('state')}
						autocomplete="off"
						spellcheck="false"
						bind:value={stateOverride}
						onchange={(event) => set('state', event)}
						style:padding
						disabled={Boolean(template?.state?.output)}
						class:disabled={Boolean(template?.state?.output)}
					/>
				{/snippet}
			</InputClear>

			<button
				use:Ripple={$ripple}
				title={$lang('template')}
				class="icon-gallery"
				onclick={async () => {
					if (!sel?.id) return;
					openModal(() => import('$lib/Modal/Templater.svelte'), {
						sel,
						type: 'state'
					});
				}}
				style:padding="0.85rem"
				class:template-active={template?.state?.output}
			>
				<Icon icon="ph:brackets-curly-bold" height="none" /></button
			>
		</div>

		<h2>
			{$lang('icon')}
		</h2>

		<div class="icon-gallery-container">
			<InputClear
				condition={icon}
				onclear={() => {
					icon = undefined;
					set('icon');
				}}
			>
				{#snippet children(padding)}
					<input
						name={$lang('icon')}
						class="input"
						type="text"
						placeholder={(sel?.template?.icon && template?.icon?.output) ||
							computedIcon ||
							$lang('icon')}
						autocomplete="off"
						spellcheck="false"
						bind:value={icon}
						onchange={(event) => set('icon', event)}
						style:padding
						disabled={Boolean(sel?.template?.icon && template?.icon?.output)}
						class:disabled={Boolean(sel?.template?.icon && template?.icon?.output)}
					/>
				{/snippet}
			</InputClear>

			<button
				use:Ripple={$ripple}
				title={$lang('icon')}
				class="icon-gallery"
				onclick={() => {
					window.open('https://icon-sets.iconify.design/', '_blank');
				}}
				style:padding="0.84rem"
			>
				<Icon icon="majesticons:open-line" height="none" />
			</button>

			<button
				use:Ripple={$ripple}
				title={$lang('template')}
				class="icon-gallery"
				onclick={() => {
					if (!sel?.id) return;
					openModal(() => import('$lib/Modal/Templater.svelte'), {
						sel,
						type: 'icon'
					});
				}}
				style:padding="0.85rem"
				class:template-active={sel?.template?.icon && template?.icon?.output}
			>
				<Icon icon="ph:brackets-curly-bold" height="none" /></button
			>
		</div>

		<h2>{$lang('color')}</h2>

		<div class="icon-gallery-container">
			<InputClear
				condition={color}
				onclear={() => {
					color = undefined;
					set('color');
				}}
			>
				{#snippet children(padding)}
					<input
						name={$lang('color')}
						class="input"
						type="text"
						placeholder={sel?.template?.color && template?.color?.output
							? template?.color?.output
							: $states?.[sel?.entity_id]?.attributes?.hs_color
								? `hsl(${$states?.[sel?.entity_id]?.attributes?.hs_color}%, 50%)`
								: 'rgb(75, 166, 237)'}
						autocomplete="off"
						spellcheck="false"
						bind:value={color}
						onchange={(event) => set('color', event)}
						style:padding
						disabled={Boolean(template?.color?.output) || displayOnly}
						class:disabled={Boolean(template?.color?.output) || displayOnly}
					/>
				{/snippet}
			</InputClear>

			<input
				type="color"
				bind:value={color}
				onclick={() => {
					if (color === undefined) {
						color = '#ffffff';
					}
				}}
				onchange={(event) => set('color', event)}
				title={$lang('color')}
				disabled={displayOnly}
			/>

			<button
				use:Ripple={$ripple}
				title={$lang('template')}
				class="icon-gallery"
				onclick={() => {
					if (!sel?.id) return;
					openModal(() => import('$lib/Modal/Templater.svelte'), {
						sel,
						type: 'color'
					});
				}}
				style:padding="0.85rem"
				class:template-active={template?.color?.output}
				class:disabled={displayOnly}
			>
				<Icon icon="ph:brackets-curly-bold" height="none" /></button
			>
		</div>

		<!-- Display-Only Option Section -->
		<h2>{$lang('display_only') || 'Display Only'}</h2>
		<div class="button-container">
			<button
				class:selected={displayOnly}
				onclick={() => {
					displayOnly = true;
					set('displayOnly', true);
				}}
				use:Ripple={$ripple}
			>
				{$lang('yes')}
			</button>
			<button
				class:selected={!displayOnly}
				onclick={() => {
					displayOnly = false;
					set('displayOnly', false);
				}}
				use:Ripple={$ripple}
			>
				{$lang('no')}
			</button>
		</div>

		{#if suggestDisplayOnly && !displayOnly}
			<div class="suggestion-box">
				<Icon
					icon="mdi:lightbulb-outline"
					height="1.5em"
					width="4em"
					style="margin-right: 0.5rem;"
				/>
				{$lang('display_only_suggestion') ||
					'This entity type is commonly used for displaying status. Consider setting it as "Display Only".'}
			</div>
		{/if}

		<!-- Slide Brightness Option - Only for Light Entities -->
		{#if isLightEntity && !displayOnly}
			<h2>{$lang('slide_brightness')}</h2>
			<div class="button-container">
				<button
					class:selected={slideBrightness}
					onclick={() => {
						slideBrightness = true;
						set('slide_brightness', true);
					}}
					use:Ripple={$ripple}
				>
					{$lang('yes')}
				</button>
				<button
					class:selected={!slideBrightness}
					onclick={() => {
						slideBrightness = false;
						set('slide_brightness', false);
					}}
					use:Ripple={$ripple}
				>
					{$lang('no')}
				</button>
			</div>

			<h2>Circle percentage ring</h2>
			<div class="button-container">
				<button
					class:selected={showCircle}
					onclick={() => {
						showCircle = true;
						set('show_circle', true);
					}}
					use:Ripple={$ripple}
				>
					{$lang('yes')}
				</button>
				<button
					class:selected={!showCircle}
					onclick={() => {
						showCircle = false;
						set('show_circle', false);
					}}
					use:Ripple={$ripple}
				>
					{$lang('no')}
				</button>
			</div>
		{/if}

		{#if (isLightEntity || isCoverEntity) && !displayOnly}
			<h2>{$lang('slider_updates')}</h2>
			<p>{$lang('slider_updates_description')}</p>
			<div class="button-container">
				<button
					class:selected={sliderUpdates === 'continuous'}
					onclick={() => {
						sliderUpdates = 'continuous';
						set('slider_updates', 'continuous');
					}}
					use:Ripple={$ripple}
				>
					{$lang('slider_updates_continuous')}
				</button>
				<button
					class:selected={sliderUpdates === 'release'}
					onclick={() => {
						sliderUpdates = 'release';
						set('slider_updates', 'release');
					}}
					use:Ripple={$ripple}
				>
					{$lang('slider_updates_release')}
				</button>
			</div>
		{/if}

		<h2>{$lang('service')}</h2>

		<div class="icon-gallery-container">
			<input
				name={$lang('service')}
				class="input"
				type="text"
				placeholder={servicePlaceholder}
				autocomplete="off"
				spellcheck="false"
				disabled={true}
				class:disabled={true}
			/>

			<button
				use:Ripple={$ripple}
				title={$lang('template')}
				class="icon-gallery"
				onclick={() => {
					if (!sel?.id) return;
					openModal(() => import('$lib/Modal/Templater.svelte'), {
						sel,
						type: 'service'
					});
				}}
				style:padding="0.85rem"
				class:template-active={template?.service?.output}
				class:disabled={displayOnly}
			>
				<Icon icon="ph:brackets-curly-bold" height="none" /></button
			>
		</div>

		<h2>Popup / Modal action</h2>

		<div class="button-container">
			<button
				class:selected={popupAction === 'default'}
				onclick={() => {
					popupAction = 'default';
					set('popup_action', 'default');
					set('more_info');
				}}
				use:Ripple={$ripple}
			>
				Default Modal
			</button>

			<button
				class:selected={popupAction === 'yaml'}
				onclick={() => {
					popupAction = 'yaml';
					set('popup_action', 'yaml');
					set('more_info');
					if (!popupFile && availablePopups.length > 0) {
						popupFile = availablePopups[0].file;
						set('popup_file', popupFile);
					}
				}}
				use:Ripple={$ripple}
			>
				YAML Popup
			</button>

			<button
				class:selected={popupAction === 'none'}
				onclick={() => {
					popupAction = 'none';
					set('popup_action', 'none');
					set('more_info', false);
				}}
				use:Ripple={$ripple}
			>
				Toggle Only
			</button>
		</div>

		{#if popupAction === 'yaml'}
			<div class="popup-title-row">
				<h2>Select YAML popup</h2>
				<button
					type="button"
					class="link-btn"
					onclick={() => (showFolderConfig = !showFolderConfig)}
				>
					{showFolderConfig ? 'Hide folder' : 'Folder path...'}
				</button>
			</div>

			{#if showFolderConfig}
				<div class="folder-override-panel">
					<span class="folder-panel-label">Popups folder path (live):</span>
					<div style="display: flex; gap: 0.5rem;">
						<input
							class="input"
							type="text"
							placeholder="data/popup or /Users/.../popups"
							bind:value={customPopupDir}
							onchange={() => {
								loadPopups(customPopupDir);
								$configuration.popup_dir = customPopupDir;
							}}
						/>
						<button
							type="button"
							class="icon-gallery"
							use:Ripple={$ripple}
							onclick={() => loadPopups(customPopupDir)}
							title="Refresh popups from folder"
							style:padding="0.85rem"
						>
							<Icon icon="mdi:refresh" height="none" />
						</button>
					</div>
					{#if activePopupDir}
						<span class="folder-panel-active">Active folder: {activePopupDir}</span>
					{/if}
				</div>
			{/if}

			<div class="full-width">
				{#if availablePopups.length > 0}
					<Select
						options={availablePopups.map((p) => ({ id: p.file, label: `${p.title} (${p.file})` }))}
						placeholder="Select popup file"
						value={popupFile || undefined}
						onchange={(val) => {
							popupFile = val || '';
							set('popup_file', val || undefined);
						}}
					/>
				{:else}
					<input
						class="input"
						type="text"
						placeholder="ventilator_is_soba.yaml"
						bind:value={popupFile}
						onchange={(e) => set('popup_file', (e.target as HTMLInputElement).value)}
					/>
				{/if}
			</div>
		{/if}

		{#if popupAction !== 'none'}
			<h2>Popup trigger</h2>
			<div class="button-container">
				<button
					class:selected={popupTrigger === 'click'}
					onclick={() => {
						popupTrigger = 'click';
						set('popup_trigger', 'click');
					}}
					use:Ripple={$ripple}
				>
					Click (Tap)
				</button>

				<button
					class:selected={popupTrigger === 'hold'}
					onclick={() => {
						popupTrigger = 'hold';
						set('popup_trigger', 'hold');
					}}
					use:Ripple={$ripple}
				>
					Hold (Tap = Toggle, Hold = Popup)
				</button>
			</div>
		{/if}

		{#if isVacuumEntity && !displayOnly}
			<h2>{$lang('battery') || 'Battery'}</h2>
			<div class="button-container">
				<button
					class:selected={!hideBattery}
					onclick={() => {
						hideBattery = false;
						set('hide_battery');
					}}
					use:Ripple={$ripple}
				>
					{$lang('visible') || 'Visible'}
				</button>
				<button
					class:selected={hideBattery}
					onclick={() => {
						hideBattery = true;
						set('hide_battery', true);
					}}
					use:Ripple={$ripple}
				>
					{$lang('hidden') || 'Hidden'}
				</button>
			</div>

			<h2>
				{$lang('show_status_on_button') !== 'show_status_on_button'
					? $lang('show_status_on_button')
					: 'Status on button'}
			</h2>
			<div class="button-container">
				<button
					class:selected={showStatusOnButton}
					onclick={() => {
						showStatusOnButton = true;
						set('show_status_on_button', true);
					}}
					use:Ripple={$ripple}
				>
					{$lang('yes')}
				</button>
				<button
					class:selected={!showStatusOnButton}
					onclick={() => {
						showStatusOnButton = false;
						set('show_status_on_button');
					}}
					use:Ripple={$ripple}
				>
					{$lang('no')}
				</button>
			</div>

			<h2>{$lang('vacuum_plans') !== 'vacuum_plans' ? $lang('vacuum_plans') : 'Cleaning plans'}</h2>
			<div class="vacuum-list">
				{#each vacuumPlans as plan, i (i)}
					<div class="vacuum-list-item">
						<span class="overflow">{$states?.[plan]?.attributes?.friendly_name || plan}</span>
						<button class="vacuum-remove-btn" onclick={() => removePlan(i)}>x</button>
					</div>
				{/each}
			</div>
			<div class="vacuum-add-row">
				<div class="full-width">
					<Select
						options={$entityList('button')}
						placeholder={$lang('add') || 'Add plan entity'}
						value={newPlanEntity}
						onchange={(event) => {
							newPlanEntity = event ?? '';
						}}
						computeIcons={true}
					/>
				</div>
				<button class="icon-gallery" onclick={addPlan} use:Ripple={$ripple} style:padding="0.85rem">
					+
				</button>
			</div>

			<h2>{$lang('rooms') !== 'rooms' ? $lang('rooms') : 'Rooms'}</h2>
			<div class="vacuum-list">
				{#each vacuumRooms as room, i (i)}
					<div class="vacuum-list-item">
						<span class="overflow">{room.name} ({room.id})</span>
						<button class="vacuum-remove-btn" onclick={() => removeRoom(i)}>x</button>
					</div>
				{/each}
			</div>
			<div class="vacuum-add-row">
				<input
					class="input"
					type="text"
					placeholder="Room ID"
					bind:value={newRoomId}
					autocomplete="off"
				/>
				<input
					class="input"
					type="text"
					placeholder={$lang('name') || 'Name'}
					bind:value={newRoomName}
					autocomplete="off"
				/>
				<button class="icon-gallery" onclick={addRoom} use:Ripple={$ripple} style:padding="0.85rem">
					+
				</button>
			</div>

			<h2>
				{$lang('mop_intensity') !== 'mop_intensity'
					? $lang('mop_intensity')
					: 'Mop intensity entity'}
			</h2>
			<div class="full-width">
				<Select
					options={$entityList('select')}
					placeholder={$lang('entity') || 'Select entity'}
					value={mopIntensityEntity || undefined}
					onchange={(event) => {
						mopIntensityEntity = event || '';
						set('vacuum_mop_intensity_entity', event || undefined);
					}}
					computeIcons={true}
				/>
			</div>
		{/if}

		{#if getDomain(entity_id) === 'media_player'}
			<h2>Marquee</h2>

			<div class="button-container">
				<button
					class:selected={!sel?.marquee}
					onclick={() => set('marquee', false)}
					use:Ripple={$ripple}
				>
					{$lang('no')}
				</button>

				<button
					class:selected={sel?.marquee}
					onclick={() => set('marquee', true)}
					use:Ripple={$ripple}
				>
					{$lang('yes')}
				</button>
			</div>
		{/if}
	{/snippet}
</ConfigModal>

<style>
	input[type='color'] {
		color-scheme: dark;
		height: inherit;
		width: 3.15rem;
		padding: 0;
		-webkit-appearance: none;
		appearance: none;
		background-color: transparent;
		cursor: pointer;
		border: none;
	}

	input[type='color']::-webkit-color-swatch {
		border-radius: 0.6rem;
		border: none;
	}

	input[type='color']::-moz-color-swatch {
		border-radius: 0.6rem;
		border: none;
	}

	.template-active {
		color: rgb(59, 15, 16) !important;
		background-color: rgb(255, 193, 7) !important;
	}

	.disabled {
		opacity: 0.4;
	}

	.full-width {
		width: -webkit-fill-available;
		width: -moz-available;
	}

	.suggestion-box {
		display: flex;
		align-items: center;
		background-color: rgba(255, 193, 7, 0.2);
		border-left: 3px solid rgb(255, 193, 7);
		padding: 0.7rem 1rem;
		margin: 0.5rem 0 1.5rem 0;
		border-radius: 0.3rem;
		font-size: 0.9rem;
	}

	.vacuum-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-bottom: 0.5rem;
	}

	.vacuum-list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.7rem;
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 0.4rem;
		font-size: 0.85rem;
	}

	.vacuum-remove-btn {
		background: none;
		border: none;
		color: #e53935;
		cursor: pointer;
		font-size: 1rem;
		padding: 0 0.3rem;
		font-family: inherit;
	}

	.vacuum-add-row {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.popup-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.link-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.8rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
		font-family: inherit;
		transition: color 0.15s ease;
	}

	.link-btn:hover {
		color: white;
	}

	.folder-override-panel {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.6rem;
		margin-bottom: 0.5rem;
	}

	.folder-panel-label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 500;
	}

	.folder-panel-active {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.active-templates-container {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}

	.template-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-size: 0.82rem;
		font-family: monospace;
		color: white;
	}

	.chip-remove {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chip-remove:hover {
		color: #ff5252;
	}
</style>
