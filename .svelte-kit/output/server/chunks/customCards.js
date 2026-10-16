import "./index-server.js";
import { s as base } from "./internal.js";
import { I as writable, P as get, h as unsubscribe_stores } from "./server.js";
import "./index-server2.js";
import "./Stores.js";
import "./paths.js";
//#region src/lib/Components/Loader.svelte
function Loader($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/Stores/customCards.ts
var customCardsStore = writable([]);
var customCardsLoaded = writable(false);
var loadedScripts = /* @__PURE__ */ new Set();
var polyfillsInitialized = false;
function initHaPolyfills() {
	if (typeof window === "undefined" || typeof customElements === "undefined" || polyfillsInitialized) return;
	polyfillsInitialized = true;
	if (!window.customCards) window.customCards = [];
	if (!window.loadCardHelpers) window.loadCardHelpers = async () => ({
		createCardElement: (config) => {
			const tag = config?.type?.replace(/^custom:/, "") || "div";
			const el = document.createElement(tag);
			if (typeof el.setConfig === "function") try {
				el.setConfig(config);
			} catch {}
			return el;
		},
		createBadgeElement: () => document.createElement("div"),
		createHeaderFooterElement: () => document.createElement("div")
	});
	if (!customElements.get("ha-card")) {
		class HaCard extends HTMLElement {
			_headerEl = null;
			constructor() {
				super();
				const shadow = this.attachShadow({ mode: "open" });
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
				this._headerEl = shadow.getElementById("header");
			}
			set header(val) {
				if (this._headerEl) {
					this._headerEl.textContent = val || "";
					this._headerEl.style.display = val ? "block" : "none";
				}
			}
			get header() {
				return this._headerEl?.textContent || "";
			}
		}
		customElements.define("ha-card", HaCard);
	}
	if (!customElements.get("ha-icon")) {
		class HaIcon extends HTMLElement {
			static get observedAttributes() {
				return ["icon"];
			}
			_icon = "";
			_container = null;
			constructor() {
				super();
				const shadow = this.attachShadow({ mode: "open" });
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
				this._container = shadow.getElementById("c");
			}
			set icon(val) {
				this._icon = val || "";
				this._renderIcon();
			}
			get icon() {
				return this._icon;
			}
			attributeChangedCallback(name, _oldVal, newVal) {
				if (name === "icon") {
					this._icon = newVal || "";
					this._renderIcon();
				}
			}
			async _renderIcon() {
				if (!this._icon || !this._container) return;
				const clean = this._icon.startsWith("mdi:") ? this._icon.replace("mdi:", "") : this._icon.replace(/^[^:]+:/, "");
				try {
					const res = await fetch(`https://api.iconify.design/mdi/${clean}.svg`);
					if (res.ok) {
						const svg = await res.text();
						if (this._container) this._container.innerHTML = svg;
					}
				} catch {}
			}
		}
		customElements.define("ha-icon", HaIcon);
	}
	if (!customElements.get("ha-state-icon")) {
		class HaStateIcon extends HTMLElement {
			_hass = null;
			_stateObj = null;
			_icon = "";
			_haIcon = null;
			constructor() {
				super();
				const shadow = this.attachShadow({ mode: "open" });
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
				this._haIcon = shadow.getElementById("icon");
			}
			set hass(val) {
				this._hass = val;
				this._update();
			}
			get hass() {
				return this._hass;
			}
			set stateObj(val) {
				this._stateObj = val;
				this._update();
			}
			get stateObj() {
				return this._stateObj;
			}
			set icon(val) {
				this._icon = val || "";
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
				const domain = obj?.entity_id?.split(".")[0] || "";
				const state = obj?.state;
				let defIcon = "mdi:help-circle";
				if (domain === "light") defIcon = state === "on" ? "mdi:lightbulb" : "mdi:lightbulb-off";
				else if (domain === "switch") defIcon = state === "on" ? "mdi:toggle-switch" : "mdi:toggle-switch-off";
				else if (domain === "binary_sensor") defIcon = state === "on" ? "mdi:radiobox-marked" : "mdi:radiobox-blank";
				else if (domain === "fan") defIcon = "mdi:fan";
				else if (domain === "cover") defIcon = state === "open" ? "mdi:window-shutter-open" : "mdi:window-shutter";
				else if (domain === "climate") defIcon = "mdi:thermostat";
				else if (domain === "alarm_control_panel") defIcon = state === "disarmed" ? "mdi:shield-off" : "mdi:shield-lock";
				else if (domain === "lock") defIcon = state === "locked" ? "mdi:lock" : "mdi:lock-open";
				else if (domain === "media_player") defIcon = state === "playing" ? "mdi:play" : "mdi:pause";
				else if (domain === "vacuum") defIcon = "mdi:robot-vacuum";
				else if (domain === "person") defIcon = "mdi:account";
				else if (domain === "sensor") defIcon = "mdi:eye";
				else if (domain === "update") defIcon = "mdi:package-up";
				this._haIcon.icon = defIcon;
			}
		}
		customElements.define("ha-state-icon", HaStateIcon);
	}
	if (!customElements.get("ha-relative-time")) {
		class HaRelativeTime extends HTMLElement {
			set datetime(val) {
				this.textContent = val || "";
			}
			set hass(_val) {}
		}
		customElements.define("ha-relative-time", HaRelativeTime);
	}
	if (!customElements.get("ha-svg-icon")) {
		class HaSvgIcon extends HTMLElement {
			static get observedAttributes() {
				return ["path", "viewBox"];
			}
			_path = "";
			_viewBox = "0 0 24 24";
			_pathEl = null;
			_svgEl = null;
			constructor() {
				super();
				const shadow = this.attachShadow({ mode: "open" });
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
				this._svgEl = shadow.querySelector("svg");
				this._pathEl = shadow.querySelector("path");
			}
			set path(val) {
				this._path = val || "";
				if (this._pathEl) this._pathEl.setAttribute("d", this._path);
			}
			get path() {
				return this._path;
			}
			set viewBox(val) {
				this._viewBox = val || "0 0 24 24";
				if (this._svgEl) this._svgEl.setAttribute("viewBox", this._viewBox);
			}
			get viewBox() {
				return this._viewBox;
			}
			attributeChangedCallback(name, _oldVal, newVal) {
				if (name === "path") this.path = newVal;
				if (name === "viewBox") this.viewBox = newVal;
			}
		}
		customElements.define("ha-svg-icon", HaSvgIcon);
	}
	class DummyElement extends HTMLElement {
		_val = "";
		_checked = false;
		_disabled = false;
		_selected = false;
		hass = null;
		config = null;
		constructor() {
			super();
			const shadow = this.attachShadow({ mode: "open" });
			shadow.innerHTML = "<slot></slot>";
		}
		get value() {
			return this._val;
		}
		set value(v) {
			this._val = v;
		}
		get checked() {
			return this._checked;
		}
		set checked(v) {
			this._checked = Boolean(v);
		}
		get disabled() {
			return this._disabled;
		}
		set disabled(v) {
			this._disabled = Boolean(v);
		}
		get selected() {
			return this._selected;
		}
		set selected(v) {
			this._selected = Boolean(v);
		}
		setConfig(cfg) {
			this.config = cfg;
		}
	}
	for (const tag of [
		"ha-ripple",
		"ha-tile-icon",
		"ha-tile-info",
		"ha-tile-badge",
		"hui-card-features",
		"hui-card-features-editor",
		"ha-button",
		"ha-icon-button",
		"ha-alert",
		"ha-circular-progress",
		"ha-button-menu",
		"ha-dropdown",
		"ha-dropdown-item",
		"mwc-list",
		"mwc-list-item",
		"mwc-menu",
		"mwc-button",
		"mwc-icon-button",
		"mwc-ripple",
		"mwc-switch",
		"mwc-tab",
		"mwc-tab-bar",
		"ha-switch",
		"ha-textfield",
		"ha-select",
		"ha-dialog",
		"ha-slider",
		"ha-bar",
		"ha-combo-box",
		"hui-conditional-base",
		"ha-form",
		"ha-form-bc_cluster",
		"ha-form-bc_group",
		"ha-selector-bc_object",
		"ha-selector-calendar_entity"
	]) if (!customElements.get(tag)) try {
		customElements.define(tag, class extends DummyElement {});
	} catch {}
}
async function fetchCustomCards(force = false) {
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
		console.error("Failed to fetch custom cards:", err);
	}
	return get(customCardsStore);
}
/**
* Ensures the Web Component script for the given card file and tagName is loaded in the browser.
*/
async function ensureCardLoaded(cardFile, tagName) {
	if (typeof window === "undefined" || typeof customElements === "undefined") return false;
	initHaPolyfills();
	if (customElements.get(tagName)) return true;
	const scriptSrc = `${base}/_api/custom_cards/file?name=${encodeURIComponent(cardFile)}`;
	if (loadedScripts.has(cardFile)) try {
		await Promise.race([customElements.whenDefined(tagName), new Promise((r) => setTimeout(r, 2e3))]);
		return Boolean(customElements.get(tagName));
	} catch {
		return Boolean(customElements.get(tagName));
	}
	return new Promise((resolve) => {
		const script = document.createElement("script");
		script.type = "module";
		script.src = scriptSrc;
		const timeout = setTimeout(() => {
			resolve(Boolean(customElements.get(tagName)));
		}, 8e3);
		script.onload = async () => {
			clearTimeout(timeout);
			loadedScripts.add(cardFile);
			try {
				await Promise.race([customElements.whenDefined(tagName), new Promise((r) => setTimeout(r, 2e3))]);
			} catch {}
			resolve(Boolean(customElements.get(tagName)));
		};
		script.onerror = () => {
			clearTimeout(timeout);
			console.error(`Failed to load custom card script: ${scriptSrc}`);
			resolve(false);
		};
		document.head.appendChild(script);
	});
}
//#endregion
export { Loader as a, initHaPolyfills as i, ensureCardLoaded as n, fetchCustomCards as r, customCardsStore as t };
