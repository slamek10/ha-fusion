<script lang="ts">
	import ComputeIcon from '$lib/Components/ComputeIcon.svelte';
	import StateLogic from '$lib/Components/StateLogic.svelte';
	import {
		connection,
		editMode,
		itemHeight,
		lang,
		motion,
		onStates,
		climateHvacActionToMode,
		ripple,
		states,
		templates,
		config,
		selectedLanguage,
		calendarView,
		calendarFirstDay
	} from '$lib/Stores';
	import { getDomain, getName, getTogglableService, isDisplayOnlyDomain } from '$lib/Utils';
	import Icon, { loadIcon } from '@iconify/svelte';
	import { callService, type HassEntity } from 'home-assistant-js-websocket';
	import { marked } from 'marked';
	import { onDestroy } from 'svelte';
	import { openModal } from '$lib/Modals';
	import Ripple from '$lib/Actions/ripple';
	import * as parser from 'js-yaml';
	import {
		buttonTemplateStore,
		fetchButtonTemplates,
		resolveTemplateHierarchy,
		hasCircleInTemplates,
		getCustomIconFromTemplates,
		evaluateButtonCardJs,
		stylesToCss,
		getItemShape
	} from '$lib/Stores/buttonTemplates';

	let {
		demo = undefined,
		sel,
		sectionName = undefined,
		displayOnly = false
	}: {
		demo?: string | undefined;
		sel: any;
		sectionName?: string | undefined;
		displayOnly?: boolean;
	} = $props();

	let entity_id = $derived(demo || sel?.entity_id);
	let template = $derived($templates?.[sel?.id]);
	let icon = $derived((sel?.template?.icon && template?.icon?.output) || sel?.icon);
	let color = $derived((sel?.template?.color && template?.color?.output) || sel?.color);
	let marquee = $derived(sel?.marquee);
	let more_info = $derived(sel?.more_info);

	let entity: HassEntity = $state(undefined as any);
	let contentWidth: number = $state(0);
	let container: HTMLDivElement = $state(undefined as any);
	let loading: boolean = $state(false);
	let resetLoading: ReturnType<typeof setTimeout> | null = $state(null);
	let stateOn: boolean = $state(false);

	// Optimistic state management
	let optimisticStateOn: boolean | null = $state(null);
	let optimisticBrightness: number | null = $state(null);
	let optimisticResetTimeout: ReturnType<typeof setTimeout> | null = $state(null);

	// Brightness slider variables
	let isSliding = $state(false);
	let slideStartX = $state(0);
	let targetBrightness: number | null = $state(null);
	let slideBrightness = $state(0);
	let debounceTimeout: ReturnType<typeof setTimeout> | null = $state(null);

	let isDisplayOnly = $derived(
		displayOnly === true || (sel?.displayOnly ?? isDisplayOnlyDomain(entity_id))
	);

	// Hold gesture and popup options
	let holdTimer: ReturnType<typeof setTimeout> | null = $state(null);
	let holdTriggered = $state(false);

	function startHoldGesture() {
		if ($editMode || isDisplayOnly) return;
		holdTriggered = false;
		cancelHoldGesture();

		const canHold = sel?.popup_trigger === 'hold' || sel?.popup_action === 'yaml';
		if (canHold) {
			holdTimer = setTimeout(() => {
				holdTriggered = true;
				if (typeof navigator !== 'undefined' && navigator?.vibrate) {
					try {
						navigator.vibrate(40);
					} catch {}
				}
				openConfiguredModal();
			}, 450);
		}
	}

	function cancelHoldGesture() {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
	}

	// Check if this is a light entity that supports brightness and has slide_brightness enabled
	let isLightWithBrightness = $derived(
		getDomain(entity_id) === 'light' &&
			entity?.attributes?.brightness !== undefined &&
			sel?.slide_brightness !== false
	);

	// Get current brightness (0-255 range from HA, convert to 0-100 percentage)
	// Use optimistic brightness if available, otherwise use actual
	let currentBrightness = $derived(
		optimisticBrightness !== null
			? optimisticBrightness
			: entity?.attributes?.brightness
				? Math.round((entity.attributes.brightness / 255) * 100)
				: 0
	);

	$effect(() => {
		if (!$buttonTemplateStore.loaded) {
			fetchButtonTemplates();
		}
	});

	let currentState = $derived(
		optimisticStateOn !== null
			? optimisticStateOn
				? 'on'
				: 'off'
			: entity?.state || 'off'
	);

	let activeTemplateNames = $derived.by(() => {
		const list: string[] = [];
		if (Array.isArray(sel?.button_templates)) {
			list.push(...sel.button_templates);
		}
		if (sel?.button_template && !list.includes(sel.button_template)) {
			list.push(sel.button_template);
		}
		return list;
	});

	let resolvedTemplateKeys = $derived(
		resolveTemplateHierarchy(activeTemplateNames, $buttonTemplateStore.definitions)
	);

	let templateCustomIcon = $derived(
		getCustomIconFromTemplates(resolvedTemplateKeys, $buttonTemplateStore.definitions, {
			entity,
			state: currentState,
			stateOn,
			states: $states
		})
	);

	let templateStateDisplay = $derived.by(() => {
		if (sel?.state_display) {
			const evaluated = evaluateButtonCardJs(sel.state_display, {
				entity,
				state: currentState,
				stateOn,
				states: $states
			});
			if (evaluated) return evaluated;
		}
		for (const key of resolvedTemplateKeys) {
			const def = $buttonTemplateStore.definitions[key];
			if (def?.state_display) {
				const evaluated = evaluateButtonCardJs(def.state_display, {
					entity,
					state: currentState,
					stateOn,
					states: $states
				});
				if (evaluated) return evaluated;
			}
		}
		return null;
	});

	let showCircleRing = $derived(
		isLightWithBrightness &&
			(sel?.show_circle || hasCircleInTemplates(resolvedTemplateKeys, sel?.show_circle)) &&
			stateOn
	);

	let itemShape = $derived(getItemShape(sel, $buttonTemplateStore.definitions));
	let isSquare = $derived(itemShape === 'square');
	let isMedium = $derived(itemShape === 'medium');

	/** display loader if no state change has occurred within `$motion`ms */
	let delayLoading: ReturnType<typeof setTimeout> | null = $state(null);

	/**
	 * Observes changes in the `last_updated` property of an entity.
	 * When the `last_updated` property changes:
	 *
	 * - Updates `entity` with the new state from `$states`
	 * - Resets the `loading` state to `false`
	 * - Clears any pending loading or reset timeouts
	 */
	$effect(() => {
		if (entity_id && $states?.[entity_id]?.last_updated !== entity?.last_updated) {
			entity = $states?.[entity_id];

			loading = false;

			if (delayLoading) {
				clearTimeout(delayLoading);
				delayLoading = null;
			}

			if (resetLoading) {
				clearTimeout(resetLoading);
				resetLoading = null;
			}

			// Clear optimistic state when real state updates
			clearOptimisticState();
		}
	});

	let attributes = $derived(entity?.attributes);

	function kelvinToRgb(k: number): string {
		const temp = Math.max(1000, Math.min(40000, k)) / 100;
		let r: number, g: number, b: number;
		if (temp <= 66) {
			r = 255;
			g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
			b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
		} else {
			r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
			g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
			b = 255;
		}
		return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
	}

	function computeLightColor(ent: HassEntity | undefined, customColor?: string): string {
		if (customColor) return customColor;
		if (!ent?.attributes) return 'rgb(75, 166, 237)';
		const attrs = ent.attributes;
		if (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length >= 3) {
			return `rgb(${attrs.rgb_color[0]}, ${attrs.rgb_color[1]}, ${attrs.rgb_color[2]})`;
		}
		if (Array.isArray(attrs.hs_color) && attrs.hs_color.length >= 2) {
			return `hsl(${attrs.hs_color[0]}, ${attrs.hs_color[1]}%, 50%)`;
		}
		if (attrs.color_temp_kelvin) {
			return kelvinToRgb(attrs.color_temp_kelvin);
		}
		if (attrs.color_temp) {
			return kelvinToRgb(Math.round(1000000 / attrs.color_temp));
		}
		return 'rgb(75, 166, 237)';
	}

	let iconColor = $derived(
		color
			? color
			: attributes?.hs_color
				? `hsl(${attributes?.hs_color[0]}, ${attributes?.hs_color[1]}%, 50%)`
				: 'rgb(75, 166, 237)'
	);

	let activeLightColor = $derived(computeLightColor(entity, color));
	let customIconCss = $derived(stylesToCss(templateCustomIcon?.styles));

	// icon is image if extension, e.g. test.png
	let image = $derived(icon?.includes('.'));

	$effect(() => {
		if (optimisticStateOn !== null) {
			// Use optimistic state if available
			stateOn = optimisticStateOn;
		} else if (sel?.template?.set_state && template?.set_state?.output) {
			// template
			stateOn = $onStates?.includes(template?.set_state?.output?.toLocaleLowerCase());
		} else if (attributes?.hvac_action) {
			// climate
			stateOn = $onStates?.includes(
				$climateHvacActionToMode?.[attributes?.hvac_action]?.toLocaleLowerCase()
			);
		} else if (attributes?.in_progress) {
			// update
			stateOn = typeof attributes.in_progress === 'number';
		} else {
			// default
			stateOn = $onStates?.includes(entity?.state?.toLocaleLowerCase());
		}
	});

	/**
	 * Sets optimistic state immediately for better UX
	 */
	function setOptimisticState(state: string, stateOn: boolean, brightness?: number) {
		optimisticStateOn = stateOn;
		if (brightness !== undefined) {
			optimisticBrightness = brightness;
		}

		// Clear optimistic state after timeout if no real state update
		if (optimisticResetTimeout) {
			clearTimeout(optimisticResetTimeout);
		}
		optimisticResetTimeout = setTimeout(() => {
			clearOptimisticState();
		}, 5000); // 5 second fallback
	}

	/**
	 * Clears optimistic state
	 */
	function clearOptimisticState() {
		optimisticStateOn = null;
		optimisticBrightness = null;
		if (optimisticResetTimeout) {
			clearTimeout(optimisticResetTimeout);
			optimisticResetTimeout = null;
		}
	}

	/**
	 * Toggles the state of the specified entity
	 * using the correct service call...
	 */
	function toggle() {
		// For display-only entities, don't do anything when clicked
		if (isDisplayOnly) {
			return; // No action for display-only entities
		}

		// if service template
		if (sel?.template?.service && template?.service?.output) {
			try {
				// template is string, try to parse it
				const _template = parser.load(template?.service?.output) as {
					service: string;
					data: Record<string, string | number | boolean>;
				};

				if (_template?.service) {
					const [domain, service] = _template.service.split('.');
					callService($connection, domain, service, _template?.data);
				}
			} catch (error) {
				console.error('Template service YAML parse error:', error);
			}

			return;
		}

		// default
		const service = getTogglableService(entity);

		if (service) {
			// Set optimistic state immediately for common entities
			if (getDomain(entity_id) === 'light') {
				const currentlyOn = $onStates?.includes(entity?.state?.toLocaleLowerCase());
				if (currentlyOn) {
					setOptimisticState('off', false, 0);
				} else {
					setOptimisticState(
						'on',
						true,
						entity?.attributes?.brightness
							? Math.round((entity.attributes.brightness / 255) * 100)
							: 100
					);
				}
			} else {
				// For other toggleable entities, just toggle the on/off state
				const currentlyOn = $onStates?.includes(entity?.state?.toLocaleLowerCase());
				setOptimisticState(currentlyOn ? 'off' : 'on', !currentlyOn);
			}

			// use returned domain to handle specific cases such
			// as 'remote', which uses 'homeassistant.toggle'
			const [_domain, _service] = service.split('.');
			callService($connection, _domain, _service, {
				entity_id
			});

			// loader
			delayLoading = setTimeout(() => {
				loading = true;
			}, $motion);

			// loader 20s fallback
			resetLoading = setTimeout(() => {
				loading = false;
			}, 20_000);
		} else if (more_info !== false) {
			// not in getTogglableService just open modal; call openEntityModal
			// directly because handleClickEvent would recurse back into toggle
			// when more_info is false, where the click is a deliberate no-op
			openEntityModal();
		}
	}

	/**
	 * Delegate to handleEvent
	 */
	function handlePointer() {
		handleEvent({ type: 'preload' });
	}

	/**
	 * handleEvent
	 * pointerenter | pointerdown | click
	 */
	async function handleEvent(event: any) {
		if (event.type === 'click') {
			await handleClickEvent();
		} else {
			await handlePointerEvent();
		}
	}

	/**
	 * Handle click events
	 * Opens modal for specified domain or custom popup
	 */
	async function handleClickEvent() {
		if (holdTriggered) {
			holdTriggered = false;
			return;
		}
		cancelHoldGesture();

		if ($editMode) {
			openModal(() => import('$lib/Modal/ButtonConfig.svelte'), {
				demo: entity_id,
				sel,
				sectionName
			});
			return;
		} else if (sel?.popup_trigger === 'hold') {
			// In hold mode, tapping toggles
			toggle();
		} else if (sel?.popup_action === 'none') {
			toggle();
		} else if (sel?.popup_action === 'yaml' && sel?.popup_file) {
			openModal(() => import('$lib/Modal/YamlPopupModal.svelte'), {
				file: sel.popup_file,
				sel
			});
		} else if (more_info === false) {
			toggle();
		} else {
			await openConfiguredModal();
		}
	}

	async function openConfiguredModal() {
		if (sel?.popup_action === 'yaml' && sel?.popup_file) {
			openModal(() => import('$lib/Modal/YamlPopupModal.svelte'), {
				file: sel.popup_file,
				sel
			});
			return;
		}

		if (sel?.popup_action === 'none') {
			toggle();
			return;
		}

		await openEntityModal();
	}

	/**
	 * Opens modal for specified domain
	 */
	async function openEntityModal() {
		switch (getDomain(sel?.entity_id)) {
			// light
			case 'light':
				openModal(() => import('$lib/Modal/LightModal.svelte'), {
					sel: sel
				});
				break;

			// switch
			case 'input_boolean':
			case 'remote':
			case 'siren':
			case 'switch':
				openModal(() => import('$lib/Modal/SwitchModal.svelte'), { sel });
				break;

			// script
			case 'script':
				openModal(() => import('$lib/Modal/ScriptModal.svelte'), { sel });
				break;

			// automation
			case 'automation':
				openModal(() => import('$lib/Modal/AutomationModal.svelte'), { sel });
				break;

			// calendar
			case 'calendar': {
				// set first day of week
				$calendarFirstDay =
					'weekInfo' in Intl.Locale.prototype
						? (new Intl.Locale($selectedLanguage) as any)?.weekInfo.firstDay
						: (await import('weekstart')).getWeekStartByLocale($selectedLanguage);

				// set calendar view type
				$calendarView = localStorage.getItem('calendar');

				openModal(() => import('$lib/Modal/CalendarModal.svelte'), { sel });
				break;
			}

			// sensor
			case 'air_quality':
			case 'date':
			case 'time':
			case 'event':
			case 'image_processing':
			case 'mailbox':
			case 'sensor':
			case 'binary_sensor':
			case 'stt':
			case 'weather':
			case 'button':
			case 'scene':
			case 'schedule':
			case 'sun':
			case 'person':
			case 'zone':
			case 'input_button':
				openModal(() => import('$lib/Modal/SensorModal.svelte'), { sel });
				break;

			// update
			case 'update':
				openModal(() => import('$lib/Modal/UpdateModal.svelte'), { sel });
				break;

			// number
			case 'input_number':
			case 'number':
				openModal(() => import('$lib/Modal/InputNumberModal.svelte'), { sel });
				break;

			// date
			case 'input_datetime':
			case 'datetime':
				openModal(() => import('$lib/Modal/InputDateModal.svelte'), { sel });
				break;

			// select
			case 'input_select':
			case 'select':
				openModal(() => import('$lib/Modal/InputSelectModal.svelte'), { sel });
				break;

			// text
			case 'input_text':
			case 'text':
				openModal(() => import('$lib/Modal/InputTextModal.svelte'), { sel });
				break;

			case 'timer':
				openModal(() => import('$lib/Modal/TimerModal.svelte'), { sel });
				break;

			case 'vacuum':
				openModal(() => import('$lib/Modal/VacuumModal.svelte'), { sel });
				break;

			case 'lawn_mower':
				openModal(() => import('$lib/Modal/LawnMowerModal.svelte'), { sel });
				break;

			case 'valve':
				openModal(() => import('$lib/Modal/ValveModal.svelte'), { sel });
				break;

			case 'image':
				openModal(() => import('$lib/Modal/ImageModal.svelte'), { sel });
				break;

			case 'todo':
				openModal(() => import('$lib/Modal/TodoModal.svelte'), { sel });
				break;

			case 'counter':
				openModal(() => import('$lib/Modal/CounterModal.svelte'), { sel });
				break;

			case 'alarm_control_panel':
				openModal(() => import('$lib/Modal/AlarmControlPanelModal.svelte'), { sel });
				break;

			case 'lock':
				openModal(() => import('$lib/Modal/LockModal.svelte'), { sel });
				break;

			case 'climate':
				openModal(() => import('$lib/Modal/ClimateModal.svelte'), { sel });
				break;

			case 'camera':
				openModal(() => import('$lib/Modal/CameraModal.svelte'), { sel });
				break;

			case 'water_heater':
				openModal(() => import('$lib/Modal/WaterHeaterModal.svelte'), { sel });
				break;

			case 'humidifier':
				openModal(() => import('$lib/Modal/HumidifierModal.svelte'), { sel });
				break;

			case 'media_player':
				openModal(() => import('$lib/Modal/MediaPlayer.svelte'), {
					selected: sel
				});
				break;

			case 'group':
				openModal(() => import('$lib/Modal/GroupModal.svelte'), { sel });
				break;

			case 'device_tracker': {
				if ($states?.[sel?.entity_id]?.attributes?.source_type === 'gps') {
					openModal(() => import('$lib/Modal/DeviceTrackerModal.svelte'), { sel });
				} else {
					openModal(() => import('$lib/Modal/SensorModal.svelte'), { sel });
				}
				break;
			}

			case 'cover':
				openModal(() => import('$lib/Modal/CoverModal.svelte'), {
					selected: sel
				});
				break;

			case 'fan':
				openModal(() => import('$lib/Modal/FanModal.svelte'), {
					selected: sel
				});
				break;

			default:
				openModal(() => import('$lib/Modal/Unknown.svelte'), {
					selected: sel
				});
				break;
		}
	}

	/**
	 * Preloads module before click event
	 */
	async function handlePointerEvent() {
		if ($editMode) {
			await import('$lib/Modal/ButtonConfig.svelte');
		} else {
			switch (getDomain(sel?.entity_id)) {
				case 'light':
					await import('$lib/Modal/LightModal.svelte');
					break;
				case 'switch':
					await import('$lib/Modal/SwitchModal.svelte');
					break;
				case 'climate':
					await import('$lib/Modal/ClimateModal.svelte');
					break;
				case 'media_player':
					await import('$lib/Modal/MediaPlayer.svelte');
					break;
				default:
					await import('$lib/Modal/Unknown.svelte');
					break;
			}
		}
	}

	////// templates //////

	$effect(() => {
		if ($config?.state === 'RUNNING' && sel?.template) {
			// for each changed entry in template
			Object.entries(sel?.template as Record<string, string>).forEach(([key, value]) => {
				const compareTemplate = value === template?.[key]?.input;
				const compareEntityId = sel?.entity_id === template?.[key]?.entity_id;
				if (compareTemplate && compareEntityId) return;
				renderTemplate(key, value);
			});
		}
	});

	let unsubscribe: () => void;

	async function renderTemplate(key: string, value: string) {
		if (!$connection || !sel?.id) return;

		try {
			unsubscribe = await $connection.subscribeMessage(
				(response: { result: string } | { error: string; level: 'ERROR' | 'WARNING' }) => {
					let data: any = {
						input: value
					};

					if ('result' in response) {
						data.output =
							key === 'state' || key === 'name'
								? marked.parseInline(String(response.result))
								: String(response.result);
					} else if (response?.level === 'ERROR') {
						console.error(response.error);
						data.error = response.error;
					}

					data.entity_id = sel?.entity_id;

					$templates[sel?.id] = { ...$templates[sel?.id], [key]: data };
				},
				{
					type: 'render_template',
					template: value,
					report_errors: true,
					variables: {
						entity_id: sel?.entity_id
					}
				}
			);
		} catch (error) {
			console.error('Template error:', error);
		}
	}

	onDestroy(() => {
		cancelHoldGesture();
		unsubscribe?.();
		if (debounceTimeout) clearTimeout(debounceTimeout);
		clearOptimisticState();
	});

	// Brightness slider functions
	function handleSlideStart(event: PointerEvent | MouseEvent | TouchEvent) {
		if (!isLightWithBrightness || isDisplayOnly || $editMode) return;

		// Don't prevent default here - let normal click handling work if no slide occurs
		slideStartX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		slideBrightness = currentBrightness;
		targetBrightness = null;

		// Add global listeners
		document.addEventListener('pointermove', handleSlideMove, { passive: false });
		document.addEventListener('pointerup', handleSlideEnd, { passive: false });
		document.addEventListener('mousemove', handleSlideMove, { passive: false });
		document.addEventListener('mouseup', handleSlideEnd, { passive: false });
		document.addEventListener('touchmove', handleSlideMove, { passive: false });
		document.addEventListener('touchend', handleSlideEnd, { passive: false });
	}

	function handleSlideMove(event: PointerEvent | MouseEvent | TouchEvent) {
		const currentX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const deltaX = Math.abs(currentX - slideStartX);

		// Only start sliding if there's significant horizontal movement
		if (!isSliding && deltaX > 10) {
			isSliding = true;
			cancelHoldGesture();
			event.preventDefault();
		}

		if (!isSliding) return;

		event.preventDefault();
		const actualDeltaX = currentX - slideStartX;
		const containerRect = container.getBoundingClientRect();
		const maxWidth = containerRect.width * 0.8; // Use 80% of button width for full range

		// Calculate brightness based on horizontal movement
		const brightnessChange = (actualDeltaX / maxWidth) * 100;
		let newBrightness = Math.max(0, Math.min(100, currentBrightness + brightnessChange));

		// Snap to 0% if very close
		if (newBrightness < 5) newBrightness = 0;
		// Snap to 100% if very close
		if (newBrightness > 95) newBrightness = 100;

		slideBrightness = Math.round(newBrightness);
		targetBrightness = slideBrightness;

		if (sel?.slider_updates !== 'release') {
			// Debounced service call while retaining immediate local feedback.
			if (debounceTimeout) clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(() => {
				setBrightness(slideBrightness);
			}, 100);
		}
	}

	function handleSlideEnd() {
		cancelHoldGesture();
		// Remove global listeners immediately
		document.removeEventListener('pointermove', handleSlideMove);
		document.removeEventListener('pointerup', handleSlideEnd);
		document.removeEventListener('mousemove', handleSlideMove);
		document.removeEventListener('mouseup', handleSlideEnd);
		document.removeEventListener('touchmove', handleSlideMove);
		document.removeEventListener('touchend', handleSlideEnd);

		if (!isSliding) return;

		// Always commit the exact final value. In release mode this is the only call.
		if (debounceTimeout) clearTimeout(debounceTimeout);
		debounceTimeout = null;
		setBrightness(slideBrightness);

		// Clear slider visualization after a short delay
		setTimeout(() => {
			isSliding = false;
			targetBrightness = null;
		}, 500);
	}

	async function setBrightness(brightness: number) {
		if (!entity?.entity_id) return;

		// Set optimistic state immediately
		if (brightness === 0) {
			setOptimisticState('off', false, 0);
		} else {
			setOptimisticState('on', true, brightness);
		}

		try {
			if (brightness === 0) {
				// Turn off the light
				await callService($connection, 'light', 'turn_off', {
					entity_id: entity.entity_id
				});
			} else {
				// Turn on/set brightness (convert percentage back to 0-255 range)
				await callService($connection, 'light', 'turn_on', {
					entity_id: entity.entity_id,
					brightness: Math.round((brightness / 100) * 255)
				});
			}
		} catch (error) {
			console.error('Failed to set brightness:', error);
			// Clear optimistic state on error
			clearOptimisticState();
		}
	}
</script>

<div
	class="container"
	bind:this={container}
	data-state={stateOn}
	data-display-only={isDisplayOnly}
	data-template={resolvedTemplateKeys.join(' ')}
	data-shape={isSquare ? 'square' : isMedium ? 'medium' : 'default'}
	class:square={isSquare}
	class:medium={isMedium}
	tabindex="-1"
	style={!$editMode && !isDisplayOnly
		? 'cursor: pointer;'
		: isDisplayOnly
			? 'cursor: default;'
			: ''}
	style:width={isSquare || isMedium ? '100%' : '100%'}
	style:max-width={isSquare || isMedium ? 'var(--square-size, 161.2px)' : undefined}
	style:min-height={isSquare ? 'var(--square-size, 161.2px)' : isMedium ? 'var(--medium-size, 105.6px)' : `{$itemHeight}px`}
	style:height={isSquare ? 'var(--square-size, 161.2px)' : isMedium ? 'var(--medium-size, 105.6px)' : `{$itemHeight}px`}
	style:max-height={isSquare ? 'var(--square-size, 161.2px)' : isMedium ? 'var(--medium-size, 105.6px)' : `{$itemHeight}px`}
	style:align-self="start"
	style:aspect-ratio={isSquare ? '1 / 1' : undefined}
	onclick={(e) => {
		if (isSliding) return;
		handleClickEvent();
	}}
	onpointerenter={handlePointer}
	onpointerdown={(e) => {
		handlePointer();
		startHoldGesture();
	}}
	onpointerup={cancelHoldGesture}
	onpointercancel={cancelHoldGesture}
	onpointerleave={cancelHoldGesture}
	use:Ripple={{
		...$ripple,
		color: !$editMode
			? stateOn
				? 'rgba(0, 0, 0, 0.25)'
				: 'rgba(255, 255, 255, 0.15)'
			: 'rgba(0, 0, 0, 0)'
	}}
>
	<!-- CIRCLE BRIGHTNESS INDICATOR -->
	{#if showCircleRing}
		<div class="circle-container" data-state={stateOn}>
			<svg viewBox="0 0 50 50" class="circle-svg">
				<circle class="circle-track" cx="25" cy="25" r="20" />
				<circle
					class="circle-progress"
					cx="25"
					cy="25"
					r="20"
					style:stroke-dasharray="125.66"
					style:stroke-dashoffset={125.66 - ((currentBrightness / 100) * 125.66)}
				/>
				<text x="50%" y="54%" class="circle-text">
					{currentBrightness}<tspan class="circle-unit">%</tspan>
				</text>
			</svg>
		</div>
	{/if}

	<!-- ICON -->

	<div
		class="left"
		onclick={(e) => {
			if ($editMode) {
				e.stopPropagation();
				handleClickEvent();
			} else if (isSquare || isMedium) {
				// Let click bubble to container in square / medium mode
			} else if (!isDisplayOnly) {
				e.stopPropagation();
				handleEvent(e);
			}
		}}
		role="button"
		tabindex={isDisplayOnly ? -1 : 0}
	>
		<div
			class="icon"
			data-state={stateOn}
			data-display-only={isDisplayOnly}
			style:--icon-color={iconColor}
			style:--light-color={stateOn ? activeLightColor : '#9da0a2'}
			style:background-color={!isDisplayOnly && sel?.template?.color && template?.color?.output
				? template?.color?.output
				: undefined}
			style:background-image={!icon && attributes?.entity_picture
				? `url(${attributes?.entity_picture})`
				: image && icon
					? `url(${icon})`
					: 'none'}
			class:image
			class:has-custom-svg={Boolean(templateCustomIcon?.svg)}
		>
			{#if loading}
				<img src="loader.svg" alt="loading" style="margin:0 auto" />
			{:else if templateCustomIcon?.svg}
				<div class="template-svg-wrapper" style={customIconCss}>
					{@html templateCustomIcon.svg}
				</div>
			{:else if image || (!icon && attributes?.entity_picture)}
				&nbsp;
			{:else if icon}
				{#await loadIcon(icon)}
					<!-- loading -->
					<Icon icon="ooui:help-ltr" height="none" width="100%" />
				{:then resolvedIcon}
					<!-- exists -->
					<Icon icon={resolvedIcon} height="none" width="100%" />
				{:catch}
					<!-- doesn't exist -->
					<Icon icon="ooui:help-ltr" height="none" width="100%" />
				{/await}
			{:else if entity_id}
				<ComputeIcon {entity_id} />
			{:else}
				<Icon icon="ooui:help-ltr" height="none" width="100%" />
			{/if}
		</div>
	</div>

	<div
		class="right"
		onclick={(event) => {
			if (isSliding) return;
			if (holdTriggered) {
				holdTriggered = false;
				return;
			}
			cancelHoldGesture();
			if ($editMode) {
				event.stopPropagation();
				handleClickEvent();
			} else if (isSquare || isMedium) {
				// Let click bubble to container in square / medium mode
			} else if (!isDisplayOnly) {
				event.stopPropagation();
				toggle();
			}
		}}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				if (!$editMode && !isDisplayOnly) {
					toggle();
				} else if ($editMode) {
					handleEvent(event);
				}
			}
		}}
		onpointerdown={handleSlideStart}
		onmousedown={handleSlideStart}
		ontouchstart={handleSlideStart}
		role="button"
		tabindex={isDisplayOnly ? -1 : 0}
		aria-pressed={stateOn}
		class:sliding={isSliding}
		class:has-circle={showCircleRing}
	>
		<!-- NAME -->
		<div class="name" data-state={stateOn} data-display-only={isDisplayOnly}>
			{@html (sel?.template?.name && template?.name?.output) ||
				getName(sel, entity, sectionName) ||
				$lang('unknown')}
		</div>

		<!-- STATE -->

		<!-- only bind clientWidth if marquee is set and use svelte-fast-dimension -->
		<div class="state" data-state={stateOn} data-display-only={isDisplayOnly}>
			{#if marquee}
				<div style="width: min-content;" bind:clientWidth={contentWidth}>
					{#if templateStateDisplay}
						{@html templateStateDisplay}
					{:else if sel?.state || (sel?.template?.state && template?.state?.output)}
						{@html sel?.state || template?.state?.output}
					{:else if sel?.template?.set_state && template?.set_state?.output}
						{@html sel?.template?.set_state && $lang(template?.set_state?.output)}
					{:else}
						<StateLogic {entity_id} selected={sel} {contentWidth} />
					{/if}
				</div>
			{:else}
				<div style="overflow: hidden; text-overflow: ellipsis;">
					{#if templateStateDisplay}
						{@html templateStateDisplay}
					{:else if sel?.state || (sel?.template?.state && template?.state?.output)}
						{@html sel?.state || template?.state?.output}
					{:else if sel?.template?.set_state && template?.set_state?.output}
						{@html sel?.template?.set_state && $lang(template?.set_state?.output)}
					{:else}
						<StateLogic {entity_id} selected={sel} {contentWidth} />
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- BRIGHTNESS SLIDER OVERLAY -->
	{#if isLightWithBrightness && (isSliding || targetBrightness !== null)}
		<div class="brightness-overlay">
			<div class="brightness-fill" style:width="{targetBrightness ?? slideBrightness}%"></div>
			<div class="brightness-content">
				<div class="brightness-text">{targetBrightness ?? slideBrightness}%</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		background-color: var(--theme-button-background-color-off);
		font-family: inherit;
		width: 100%;
		height: auto;
		display: grid;
		border-radius: 0.55rem;
		margin: 0;
		grid-template-columns: min-content auto;
		grid-auto-flow: row;
		grid-template-areas: 'left right';
		--container-padding: 0.45rem;
		align-self: start;

		/* fix ripple */
		transform: translateZ(0);
		overflow: hidden;
		position: relative;
		container-type: inline-size;
	}

	.container:not(.square):not(.medium) {
		height: auto;
		max-height: fit-content;
		align-self: start;
	}

	/* Circle percentage ring (circle.yaml aesthetic) */
	.circle-container {
		position: absolute;
		top: 0.3rem;
		right: 0.35rem;
		width: 1.75rem;
		height: 1.75rem;
		pointer-events: none;
		z-index: 6;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.2s ease;
	}

	.circle-svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.circle-track {
		fill: rgba(0, 0, 0, 0.05);
		stroke: rgba(120, 120, 120, 0.25);
		stroke-width: 2.8;
	}

	.circle-progress {
		fill: none;
		stroke: #757780;
		stroke-width: 3.2;
		stroke-linecap: round;
		transform: rotate(-90deg);
		transform-origin: 50% 50%;
		transition: stroke-dashoffset 0.2s ease-out;
	}

	.circle-text {
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: -0.02rem;
		fill: #757780;
		text-anchor: middle;
		dominant-baseline: central;
	}

	.circle-unit {
		font-size: 8px;
		font-weight: 600;
	}

	.container[data-state='true'] .circle-track {
		fill: none;
		stroke: rgba(0, 0, 0, 0.12);
	}

	.container[data-state='true'] .circle-progress {
		stroke: #666870;
	}

	.container[data-state='true'] .circle-text {
		fill: #444650;
	}

	/* Display-only items get a more subtle styling */
	.container[data-display-only='true'] {
		background-color: var(--theme-display-only-background-color, rgba(0, 0, 0, 0.15));
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

	.container:not(.square):not(.medium) .right.has-circle {
		padding-right: calc(var(--container-padding) + 1.75rem + 0.15rem);
	}

	.icon {
		--icon-size: 1.95rem;
		grid-area: icon;
		height: var(--icon-size);
		width: var(--icon-size);
		color: rgb(200 200 200);
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

	/* Display-only icons have white color and no background */
	.icon[data-display-only='true'] {
		color: white;
		background-color: transparent !important;
	}

	.name {
		grid-area: name;
		font-weight: 500;
		color: inherit;
		white-space: nowrap;
		color: var(--theme-button-name-color-off);
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 0.85rem;
		margin-top: -1px;
	}

	/* Display-only items text styling */
	.name[data-display-only='true'] {
		color: var(--theme-display-only-name-color, white);
	}

	.state {
		grid-area: state;
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--theme-button-state-color-off);
		font-size: 0.78rem;
		margin-top: 1px;
	}

	/* Display-only items state styling */
	.state[data-display-only='true'] {
		color: var(--theme-display-only-state-color, rgba(255, 255, 255, 0.7));
	}

	/* Brightness slider overlay - covers entire container */
	.brightness-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 0.65rem;
		overflow: hidden;
		z-index: 10;
		pointer-events: none;
		background: rgba(0, 0, 0, 0.2);
	}

	.brightness-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: rgba(255, 255, 255, 0.15);
		transition: width 0.1s ease-out;
		min-width: 0;
	}

	.brightness-content {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		padding-right: var(--container-padding);
		z-index: 2;
	}

	.brightness-text {
		font-size: 0.9rem;
		font-weight: 500;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		background: rgba(0, 0, 0, 0.3);
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
		min-width: 2.5rem;
		text-align: center;
	}

	.right.sliding {
		cursor: ew-resize !important;
		user-select: none;
	}

	.container {
		position: relative;
	}

	.container[data-state='true'] {
		background-color: var(--theme-button-background-color-on);
		color: black;
	}

	/* Keep display-only background the same even when state is true */
	.container[data-display-only='true'][data-state='true'] {
		background-color: var(--theme-display-only-background-color, rgba(0, 0, 0, 0.15));
	}

	.icon[data-state='true'] {
		color: white;
		background-color: var(--icon-color);
	}

	/* Display-only icons stay transparent even when state is true */
	.icon[data-display-only='true'][data-state='true'] {
		color: white !important;
		background-color: transparent !important;
	}

	.name[data-state='true'] {
		color: var(--theme-button-name-color-on);
	}

	/* Display-only name text color when state is true */
	.name[data-display-only='true'][data-state='true'] {
		color: var(--theme-display-only-name-color, white);
	}

	.state[data-state='true'] {
		color: var(--theme-button-state-color-on);
	}

	/* Display-only state text color when state is true */
	.state[data-display-only='true'][data-state='true'] {
		color: var(--theme-display-only-state-color, rgba(255, 255, 255, 0.7));
	}

	/* Phone and Tablet (portrait) */
	@media all and (max-width: 768px) {
		.container {
			width: calc(50vw - 1.45rem);
		}
	}

	.template-svg-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.template-svg-wrapper :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}

	.template-svg-wrapper :global(.light-color) {
		fill: var(--light-color, #9da0a2) !important;
		transition: fill 0.25s ease;
	}

	.template-svg-wrapper :global(.on) {
		transform-box: fill-box !important;
		transform-origin: center !important;
	}

	.icon.has-custom-svg {
		background-color: transparent !important;
		padding: 0.15rem;
	}

	/* ========================================================= */
	/* SQUARE CARD LOOK (1:1 Aspect Ratio - Mattias Persson style) */
	/* ========================================================= */
	.container.square {
		display: flex !important;
		flex-direction: column !important;
		justify-content: space-between !important;
		align-items: stretch !important;
		aspect-ratio: 1 / 1 !important;
		width: 100% !important;
		max-width: var(--square-size, 161.2px) !important;
		height: 100% !important;
		max-height: var(--square-size, 161.2px) !important;
		min-height: 0 !important;
		border-radius: 1.15rem;
		padding: 0.85rem !important;
		box-sizing: border-box;
		--container-padding: 0;
		grid-template-columns: none !important;
		grid-template-areas: none !important;
	}

	.container.square .left {
		display: flex !important;
		align-items: flex-start !important;
		justify-content: flex-start !important;
		padding: 0 !important;
		width: 100% !important;
		flex: 0 0 auto !important;
	}

	.container.square .icon {
		--icon-size: 2.35rem;
		width: var(--icon-size) !important;
		height: var(--icon-size) !important;
		background-color: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
		border-radius: 0 !important;
		display: flex !important;
		align-items: center !important;
		justify-content: flex-start !important;
	}

	.container.square .icon :global(svg) {
		width: 100% !important;
		height: 100% !important;
	}

	.container.square .circle-container {
		top: 0.75rem !important;
		right: 0.75rem !important;
		width: 2.2rem !important;
		height: 2.2rem !important;
	}

	.container.square .right {
		display: flex !important;
		flex-direction: column !important;
		align-items: flex-start !important;
		justify-content: flex-end !important;
		padding: 0 !important;
		margin-top: auto !important;
		width: 100% !important;
		gap: 0.15rem !important;
		flex: 0 0 auto !important;
	}

	.container.square .name {
		font-size: 0.95rem !important;
		font-weight: 600 !important;
		line-height: 1.25 !important;
		color: rgba(255, 255, 255, 0.95);
		text-align: left !important;
		width: 100% !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		white-space: nowrap !important;
	}

	.container.square .state {
		font-size: 0.84rem !important;
		font-weight: 500 !important;
		line-height: 1.25 !important;
		color: rgba(255, 255, 255, 0.65);
		text-align: left !important;
		width: 100% !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		white-space: nowrap !important;
	}

	.container.square[data-state='true'] {
		background-color: var(--theme-button-background-color-on, rgba(255, 255, 255, 0.95)) !important;
	}

	.container.square[data-state='true'] .name {
		color: var(--theme-button-name-color-on, #111111) !important;
	}

	.container.square[data-state='true'] .state {
		color: var(--theme-button-state-color-on, rgba(0, 0, 0, 0.65)) !important;
	}

	.container.square .brightness-overlay {
		border-radius: 1.15rem !important;
	}

	/* ========================================================= */
	/* MEDIUM CARD LOOK (2/3 Height) */
	/* ========================================================= */
	.container.medium {
		display: flex !important;
		flex-direction: column !important;
		justify-content: space-between !important;
		align-items: stretch !important;
		width: 100% !important;
		max-width: var(--square-size, 161.2px) !important;
		height: 100% !important;
		max-height: var(--medium-size, 105.6px) !important;
		min-height: 0 !important;
		border-radius: 1.05rem;
		padding: 0.75rem !important;
		box-sizing: border-box;
		--container-padding: 0;
		grid-template-columns: none !important;
		grid-template-areas: none !important;
	}

	.container.medium .left {
		display: flex !important;
		align-items: flex-start !important;
		justify-content: flex-start !important;
		padding: 0 !important;
		width: 100% !important;
		flex: 0 0 auto !important;
	}

	.container.medium .icon {
		--icon-size: 2.05rem;
		width: var(--icon-size) !important;
		height: var(--icon-size) !important;
		background-color: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
		border-radius: 0 !important;
		display: flex !important;
		align-items: center !important;
		justify-content: flex-start !important;
	}

	.container.medium .icon :global(svg) {
		width: 100% !important;
		height: 100% !important;
	}

	.container.medium .circle-container {
		top: 0.65rem !important;
		right: 0.65rem !important;
		width: 2.05rem !important;
		height: 2.05rem !important;
	}

	.container.medium .right {
		display: flex !important;
		flex-direction: column !important;
		align-items: flex-start !important;
		justify-content: flex-end !important;
		padding: 0 !important;
		margin-top: auto !important;
		width: 100% !important;
		gap: 0.15rem !important;
		flex: 0 0 auto !important;
	}

	.container.medium .name {
		font-size: 0.90rem !important;
		font-weight: 600 !important;
		line-height: 1.25 !important;
		color: rgba(255, 255, 255, 0.95);
		text-align: left !important;
		width: 100% !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		white-space: nowrap !important;
	}

	.container.medium .state {
		font-size: 0.80rem !important;
		font-weight: 500 !important;
		line-height: 1.25 !important;
		color: rgba(255, 255, 255, 0.65);
		text-align: left !important;
		width: 100% !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		white-space: nowrap !important;
	}

	.container.medium[data-state='true'] {
		background-color: var(--theme-button-background-color-on, rgba(255, 255, 255, 0.95)) !important;
	}

	.container.medium[data-state='true'] .name {
		color: var(--theme-button-name-color-on, #111111) !important;
	}

	.container.medium[data-state='true'] .state {
		color: var(--theme-button-state-color-on, rgba(0, 0, 0, 0.65)) !important;
	}

	.container.medium .brightness-overlay {
		border-radius: 1.05rem !important;
	}

	/* ========================================================= */
	/* CONTAINER QUERIES FOR NARROW / COMPACT COLUMNS           */
	/* ========================================================= */
	@container (max-width: 145px) {
		.container:not(.square):not(.medium) {
			--container-padding: 0.35rem;
		}
		.container:not(.square):not(.medium) .icon {
			--icon-size: 1.65rem;
			padding: 0.24rem;
		}
		.container:not(.square):not(.medium) .name {
			font-size: 0.78rem;
		}
		.container:not(.square):not(.medium) .state {
			font-size: 0.70rem;
		}
		.container:not(.square):not(.medium) .circle-container {
			width: 1.45rem;
			height: 1.45rem;
			top: 0.2rem;
			right: 0.25rem;
		}
		.container:not(.square):not(.medium) .circle-text {
			font-size: 9px;
		}
		.container:not(.square):not(.medium) .right.has-circle {
			padding-right: calc(var(--container-padding) + 1.45rem + 0.1rem);
		}
	}

	@container (max-width: 110px) {
		.container:not(.square):not(.medium) {
			--container-padding: 0.22rem;
		}
		.container:not(.square):not(.medium) .icon {
			--icon-size: 1.4rem;
			padding: 0.18rem;
		}
		.container:not(.square):not(.medium) .name {
			font-size: 0.72rem;
		}
		.container:not(.square):not(.medium) .state {
			font-size: 0.65rem;
		}
	}
</style>
