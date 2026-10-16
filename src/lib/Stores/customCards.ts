import { writable, get } from 'svelte/store';
import { base } from '$app/paths';

export interface SubCardMeta {
	id?: string;
	tag: string;
	name: string;
	default_config?: Record<string, any>;
}

export interface CustomCardMeta {
	id: string;
	name: string;
	tag: string;
	file: string;
	url?: string;
	version?: string;
	author?: string;
	description?: string;
	default_config?: Record<string, any>;
	installed_at?: string;
	sub_cards?: SubCardMeta[];
}

export const customCardsStore = writable<CustomCardMeta[]>([]);
export const customCardsLoaded = writable<boolean>(false);

const loadedScripts = new Set<string>();
const loadingPromises = new Map<string, Promise<boolean>>();
let polyfillsInitialized = false;

export function initHaPolyfills() {
	if (typeof window === 'undefined' || typeof customElements === 'undefined') {
		return;
	}

	// Protect against third-party scripts crashing if defining already-defined custom elements
	if (!(customElements as any)._haPatched) {
		const origDefine = customElements.define.bind(customElements);
		customElements.define = function (name: string, constructor: any, options?: any) {
			if (customElements.get(name)) {
				return;
			}
			try {
				return origDefine(name, constructor, options);
			} catch (e) {
				console.warn(`[HA-Fusion] Could not define custom element "${name}":`, e);
			}
		};
		(customElements as any)._haPatched = true;
	}

	if (polyfillsInitialized) {
		return;
	}
	polyfillsInitialized = true;

	if (!(window as any).customCards) {
		(window as any).customCards = [];
	}

	if (!(window as any).loadCardHelpers) {
		(window as any).loadCardHelpers = async () => ({
			createCardElement: (config: any) => {
				const tag = config?.type?.replace(/^custom:/, '') || 'div';
				const el = document.createElement(tag);
				if (typeof (el as any).setConfig === 'function') {
					try {
						(el as any).setConfig(config);
					} catch {}
				}
				return el;
			},
			createBadgeElement: () => document.createElement('div'),
			createHeaderFooterElement: () => document.createElement('div')
		});
	}

	// <ha-card>
	if (!customElements.get('ha-card')) {
		class HaCard extends HTMLElement {
			private _headerEl: HTMLElement | null = null;
			constructor() {
				super();
				const shadow = this.attachShadow({ mode: 'open' });
				shadow.innerHTML = `
					<style>
						:host {
							background: var(--ha-card-background, var(--card-background-color, rgba(255, 255, 255, 0.05)));
							box-shadow: var(--ha-card-box-shadow, none);
							box-sizing: border-box;
							border-radius: var(--ha-card-border-radius, 0.65rem);
							border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, rgba(255, 255, 255, 0.08));
							color: var(--primary-text-color, #ffffff);
							display: block;
							transition: all 0.3s ease-out;
							position: relative;
							height: 100%;
							width: 100%;
						}
						.card-header {
							color: var(--ha-card-header-color, var(--primary-text-color, #ffffff));
							font-family: inherit;
							font-size: var(--ha-card-header-font-size, 1.25rem);
							font-weight: 500;
							letter-spacing: -0.012em;
							line-height: 1.5;
							display: block;
							padding: 1rem 1rem 0;
						}
						slot {
							display: contents;
						}
					</style>
					<div id="header" class="card-header" style="display: none;"></div>
					<slot></slot>
				`;
				this._headerEl = shadow.getElementById('header');
			}
			set header(val: string) {
				if (this._headerEl) {
					this._headerEl.textContent = val || '';
					this._headerEl.style.display = val ? 'block' : 'none';
				}
			}
			get header() {
				return this._headerEl?.textContent || '';
			}
		}
		customElements.define('ha-card', HaCard);
	}

	// <ha-icon>
	if (!customElements.get('ha-icon')) {
		class HaIcon extends HTMLElement {
			static get observedAttributes() {
				return ['icon'];
			}
			private _icon = '';
			private _container: HTMLSpanElement | null = null;

			constructor() {
				super();
				const shadow = this.attachShadow({ mode: 'open' });
				shadow.innerHTML = `
					<style>
						:host {
							display: inline-flex;
							align-items: center;
							justify-content: center;
							position: relative;
							vertical-align: middle;
							fill: currentColor;
							width: var(--mdc-icon-size, 24px);
							height: var(--mdc-icon-size, 24px);
							line-height: 1;
						}
						span {
							display: inline-flex;
							align-items: center;
							justify-content: center;
							width: 100%;
							height: 100%;
						}
						svg {
							width: 100%;
							height: 100%;
							display: block;
							fill: currentColor;
						}
					</style>
					<span id="c"></span>
				`;
				this._container = shadow.getElementById('c') as HTMLSpanElement;
			}

			set icon(val: string) {
				this._icon = val || '';
				this._renderIcon();
			}
			get icon() {
				return this._icon;
			}

			attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
				if (name === 'icon') {
					this._icon = newVal || '';
					this._renderIcon();
				}
			}

			async _renderIcon() {
				if (!this._icon || !this._container) return;
				const clean = this._icon.startsWith('mdi:')
					? this._icon.replace('mdi:', '')
					: this._icon.replace(/^[^:]+:/, '');
				try {
					const res = await fetch(`https://api.iconify.design/mdi/${clean}.svg`);
					if (res.ok) {
						const svg = await res.text();
						if (this._container) {
							this._container.innerHTML = svg;
						}
					}
				} catch {}
			}
		}
		customElements.define('ha-icon', HaIcon);
	}

	// <ha-state-icon>
	if (!customElements.get('ha-state-icon')) {
		class HaStateIcon extends HTMLElement {
			private _hass: any = null;
			private _stateObj: any = null;
			private _icon = '';
			private _haIcon: any = null;

			constructor() {
				super();
				const shadow = this.attachShadow({ mode: 'open' });
				shadow.innerHTML = `
					<style>
						:host {
							display: inline-flex;
							align-items: center;
							justify-content: center;
							line-height: 1;
						}
					</style>
					<ha-icon id="icon"></ha-icon>
				`;
				this._haIcon = shadow.getElementById('icon');
			}

			set hass(val: any) {
				this._hass = val;
				this._update();
			}
			get hass() {
				return this._hass;
			}

			set stateObj(val: any) {
				this._stateObj = val;
				this._update();
			}
			get stateObj() {
				return this._stateObj;
			}

			set icon(val: string) {
				this._icon = val || '';
				this._update();
			}
			get icon() {
				return this._icon;
			}

			_update() {
				if (!this._haIcon) return;
				if (this._icon) {
					this._haIcon.icon = this._icon;
					return;
				}
				const obj = this._stateObj;
				if (obj?.attributes?.icon) {
					this._haIcon.icon = obj.attributes.icon;
					return;
				}
				const domain = obj?.entity_id?.split('.')[0] || '';
				const state = obj?.state;
				let defIcon = 'mdi:help-circle';
				if (domain === 'light') defIcon = state === 'on' ? 'mdi:lightbulb' : 'mdi:lightbulb-off';
				else if (domain === 'switch') defIcon = state === 'on' ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off';
				else if (domain === 'binary_sensor') defIcon = state === 'on' ? 'mdi:radiobox-marked' : 'mdi:radiobox-blank';
				else if (domain === 'fan') defIcon = 'mdi:fan';
				else if (domain === 'cover') defIcon = state === 'open' ? 'mdi:window-shutter-open' : 'mdi:window-shutter';
				else if (domain === 'climate') defIcon = 'mdi:thermostat';
				else if (domain === 'alarm_control_panel') defIcon = state === 'disarmed' ? 'mdi:shield-off' : 'mdi:shield-lock';
				else if (domain === 'lock') defIcon = state === 'locked' ? 'mdi:lock' : 'mdi:lock-open';
				else if (domain === 'media_player') defIcon = state === 'playing' ? 'mdi:play' : 'mdi:pause';
				else if (domain === 'vacuum') defIcon = 'mdi:robot-vacuum';
				else if (domain === 'person') defIcon = 'mdi:account';
				else if (domain === 'sensor') defIcon = 'mdi:eye';
				else if (domain === 'update') defIcon = 'mdi:package-up';
				this._haIcon.icon = defIcon;
			}
		}
		customElements.define('ha-state-icon', HaStateIcon);
	}

	if (!customElements.get('ha-relative-time')) {
		class HaRelativeTime extends HTMLElement {
			set datetime(val: string) {
				this.textContent = val || '';
			}
			set hass(_val: any) {}
		}
		customElements.define('ha-relative-time', HaRelativeTime);
	}

	// <ha-svg-icon>
	if (!customElements.get('ha-svg-icon')) {
		class HaSvgIcon extends HTMLElement {
			static get observedAttributes() {
				return ['path', 'viewBox'];
			}
			private _path = '';
			private _viewBox = '0 0 24 24';
			private _pathEl: SVGPathElement | null = null;
			private _svgEl: SVGSVGElement | null = null;

			constructor() {
				super();
				const shadow = this.attachShadow({ mode: 'open' });
				shadow.innerHTML = `
					<style>
						:host {
							display: inline-flex;
							align-items: center;
							justify-content: center;
							position: relative;
							vertical-align: middle;
							fill: currentColor;
							width: var(--mdc-icon-size, 24px);
							height: var(--mdc-icon-size, 24px);
							line-height: 1;
							flex-shrink: 0;
						}
						svg {
							width: 100%;
							height: 100%;
							pointer-events: none;
							display: block;
							fill: currentColor;
						}
						path {
							fill: currentColor;
							transition: fill 0.2s ease;
						}
					</style>
					<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" role="img" focusable="false">
						<path></path>
					</svg>
				`;
				this._svgEl = shadow.querySelector('svg');
				this._pathEl = shadow.querySelector('path');
			}

			set path(val: string) {
				this._path = val || '';
				if (this._pathEl) {
					this._pathEl.setAttribute('d', this._path);
				}
			}
			get path() {
				return this._path;
			}

			set viewBox(val: string) {
				this._viewBox = val || '0 0 24 24';
				if (this._svgEl) {
					this._svgEl.setAttribute('viewBox', this._viewBox);
				}
			}
			get viewBox() {
				return this._viewBox;
			}

			attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
				if (name === 'path') this.path = newVal;
				if (name === 'viewBox') this.viewBox = newVal;
			}
		}
		customElements.define('ha-svg-icon', HaSvgIcon);
	}

	class DummyElement extends HTMLElement {
		private _val: any = '';
		private _checked = false;
		private _disabled = false;
		private _selected = false;
		public hass: any = null;
		public config: any = null;

		constructor() {
			super();
			const shadow = this.attachShadow({ mode: 'open' });
			shadow.innerHTML = '<slot></slot>';
		}

		get value() { return this._val; }
		set value(v: any) { this._val = v; }

		get checked() { return this._checked; }
		set checked(v: boolean) { this._checked = Boolean(v); }

		get disabled() { return this._disabled; }
		set disabled(v: boolean) { this._disabled = Boolean(v); }

		get selected() { return this._selected; }
		set selected(v: boolean) { this._selected = Boolean(v); }

		setConfig(cfg: any) { this.config = cfg; }
	}

	const dummies = [
		'ha-ripple',
		'ha-tile-icon',
		'ha-tile-info',
		'ha-tile-badge',
		'hui-card-features',
		'hui-card-features-editor',
		'ha-button',
		'ha-icon-button',
		'ha-alert',
		'ha-circular-progress',
		'ha-button-menu',
		'ha-dropdown',
		'ha-dropdown-item',
		'mwc-list',
		'mwc-list-item',
		'mwc-menu',
		'mwc-button',
		'mwc-icon-button',
		'mwc-ripple',
		'mwc-switch',
		'mwc-tab',
		'mwc-tab-bar',
		'ha-switch',
		'ha-textfield',
		'ha-select',
		'ha-dialog',
		'ha-slider',
		'ha-bar',
		'ha-combo-box',
		'hui-conditional-base',
		'ha-form'
	];
	for (const tag of dummies) {
		if (!customElements.get(tag)) {
			try {
				customElements.define(tag, class extends DummyElement {});
			} catch {}
		}
	}
}

export async function fetchCustomCards(force = false): Promise<CustomCardMeta[]> {
	if (get(customCardsLoaded) && !force) return get(customCardsStore);
	try {
		const res = await fetch(`${base}/_api/custom_cards`);
		if (res.ok) {
			const data = await res.json();
			customCardsStore.set(data);
			customCardsLoaded.set(true);
			return data;
		}
	} catch (err) {
		console.error('Failed to fetch custom cards:', err);
	}
	return get(customCardsStore);
}

export async function installCustomCard(
	url: string,
	name?: string,
	tag?: string
): Promise<{ ok: boolean; card?: CustomCardMeta; error?: string }> {
	try {
		const res = await fetch(`${base}/_api/custom_cards/install`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url, name, tag })
		});

		if (res.ok) {
			const json = await res.json();
			await fetchCustomCards(true);
			return { ok: true, card: json.card };
		}
		let errorMsg = 'Instalacija nije uspjela.';
		try {
			const errJson = await res.json();
			errorMsg = errJson.message || errJson.error || errorMsg;
		} catch {
			errorMsg = (await res.text()) || errorMsg;
		}
		return { ok: false, error: errorMsg };
	} catch (err: any) {
		return { ok: false, error: err?.message || 'Install failed' };
	}
}

export async function deleteCustomCard(id: string): Promise<boolean> {
	try {
		const res = await fetch(`${base}/_api/custom_cards?id=${encodeURIComponent(id)}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			await fetchCustomCards(true);
			return true;
		}
	} catch (err) {
		console.error('Failed to delete custom card:', err);
	}
	return false;
}

function checkAndAliasTag(tagName: string): boolean {
	if (customElements.get(tagName)) {
		return true;
	}

	// 1. Try removing common suffixes like -bundle, -card-bundle
	const candidates = [
		tagName.replace(/-card-bundle$/, ''),
		tagName.replace(/-bundle$/, ''),
		tagName.replace(/-card$/, ''),
		`${tagName}-card`
	];

	for (const cand of candidates) {
		const existingClass = customElements.get(cand);
		if (cand !== tagName && existingClass) {
			try {
				customElements.define(tagName, class extends (existingClass as any) {} as any);
				return true;
			} catch {}
		}
	}

	// 2. Check window.customCards registry
	const cc = (window as any).customCards as Array<{ type: string; name?: string }>;
	if (Array.isArray(cc)) {
		for (const item of cc) {
			const cand = item.type?.replace(/^custom:/, '');
			const existingClass = cand ? customElements.get(cand) : undefined;
			if (cand && existingClass) {
				if (
					cand === tagName ||
					tagName.includes(cand) ||
					cand.includes(tagName) ||
					tagName.replace(/[-_]/g, '') === cand.replace(/[-_]/g, '')
				) {
					try {
						customElements.define(tagName, class extends (existingClass as any) {} as any);
						return true;
					} catch {}
				}
			}
		}
	}

	return false;
}

/**
 * Ensures the Web Component script for the given card file and tagName is loaded in the browser.
 */
export async function ensureCardLoaded(cardFile: string, tagName: string): Promise<boolean> {
	if (typeof window === 'undefined' || typeof customElements === 'undefined') {
		return false;
	}

	initHaPolyfills();

	// Check if already registered or alias is resolvable
	if (checkAndAliasTag(tagName)) {
		return true;
	}

	if (!loadingPromises.has(cardFile)) {
		const scriptSrc = `${base}/_api/custom_cards/file?name=${encodeURIComponent(cardFile)}`;
		loadingPromises.set(
			cardFile,
			new Promise<boolean>((resolve) => {
				const script = document.createElement('script');
				script.type = 'module';
				script.src = scriptSrc;

				const timeout = setTimeout(() => {
					resolve(checkAndAliasTag(tagName));
				}, 8000);

				script.onload = async () => {
					clearTimeout(timeout);
					loadedScripts.add(cardFile);
					try {
						await Promise.race([
							customElements.whenDefined(tagName),
							new Promise((r) => setTimeout(r, 1000))
						]);
					} catch {}
					resolve(checkAndAliasTag(tagName));
				};

				script.onerror = () => {
					clearTimeout(timeout);
					loadingPromises.delete(cardFile);
					console.error(`Failed to load custom card script: ${scriptSrc}`);
					resolve(false);
				};

				document.head.appendChild(script);
			})
		);
	}

	const ok = await loadingPromises.get(cardFile);
	if (!ok) {
		return checkAndAliasTag(tagName);
	}
	return checkAndAliasTag(tagName);
}
