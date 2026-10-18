import{Bt as e,Ht as t}from"./Cm_oQ0TZ.js";import{s as n}from"./Crstj2o4.js";var r=t([]),i=t(!1),a=new Set,o=new Map,s=!1;function c(){if(typeof window>`u`||typeof customElements>`u`)return;if(!customElements._haPatched){let e=customElements.define.bind(customElements);customElements.define=function(t,n,r){if(!customElements.get(t))try{return e(t,n,r)}catch(e){console.warn(`[HA-Fusion] Could not define custom element "${t}":`,e)}},customElements._haPatched=!0}if(s)return;if(s=!0,window.customCards||(window.customCards=[]),window.loadCardHelpers||(window.loadCardHelpers=async()=>({createCardElement:e=>{let t=e?.type?.replace(/^custom:/,``)||`div`,n=document.createElement(t);if(typeof n.setConfig==`function`)try{n.setConfig(e)}catch{}return n},createBadgeElement:()=>document.createElement(`div`),createHeaderFooterElement:()=>document.createElement(`div`)})),!customElements.get(`ha-card`)){class e extends HTMLElement{_headerEl=null;constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`
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
				`,this._headerEl=e.getElementById(`header`)}set header(e){this._headerEl&&(this._headerEl.textContent=e||``,this._headerEl.style.display=e?`block`:`none`)}get header(){return this._headerEl?.textContent||``}}customElements.define(`ha-card`,e)}if(!customElements.get(`ha-icon`)){class e extends HTMLElement{static get observedAttributes(){return[`icon`]}_icon=``;_container=null;constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`
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
				`,this._container=e.getElementById(`c`)}set icon(e){this._icon=e||``,this._renderIcon()}get icon(){return this._icon}attributeChangedCallback(e,t,n){e===`icon`&&(this._icon=n||``,this._renderIcon())}async _renderIcon(){if(!this._icon||!this._container)return;let e=this._icon.startsWith(`mdi:`)?this._icon.replace(`mdi:`,``):this._icon.replace(/^[^:]+:/,``);try{let t=await fetch(`https://api.iconify.design/mdi/${e}.svg`);if(t.ok){let e=await t.text();this._container&&(this._container.innerHTML=e)}}catch{}}}customElements.define(`ha-icon`,e)}if(!customElements.get(`ha-state-icon`)){class e extends HTMLElement{_hass=null;_stateObj=null;_icon=``;_haIcon=null;constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`
					<style>
						:host {
							display: inline-flex;
							align-items: center;
							justify-content: center;
							line-height: 1;
						}
					</style>
					<ha-icon id="icon"></ha-icon>
				`,this._haIcon=e.getElementById(`icon`)}set hass(e){this._hass=e,this._update()}get hass(){return this._hass}set stateObj(e){this._stateObj=e,this._update()}get stateObj(){return this._stateObj}set icon(e){this._icon=e||``,this._update()}get icon(){return this._icon}_update(){if(!this._haIcon)return;if(this._icon){this._haIcon.icon=this._icon;return}let e=this._stateObj;if(e?.attributes?.icon){this._haIcon.icon=e.attributes.icon;return}let t=e?.entity_id?.split(`.`)[0]||``,n=e?.state,r=`mdi:help-circle`;t===`light`?r=n===`on`?`mdi:lightbulb`:`mdi:lightbulb-off`:t===`switch`?r=n===`on`?`mdi:toggle-switch`:`mdi:toggle-switch-off`:t===`binary_sensor`?r=n===`on`?`mdi:radiobox-marked`:`mdi:radiobox-blank`:t===`fan`?r=`mdi:fan`:t===`cover`?r=n===`open`?`mdi:window-shutter-open`:`mdi:window-shutter`:t===`climate`?r=`mdi:thermostat`:t===`alarm_control_panel`?r=n===`disarmed`?`mdi:shield-off`:`mdi:shield-lock`:t===`lock`?r=n===`locked`?`mdi:lock`:`mdi:lock-open`:t===`media_player`?r=n===`playing`?`mdi:play`:`mdi:pause`:t===`vacuum`?r=`mdi:robot-vacuum`:t===`person`?r=`mdi:account`:t===`sensor`?r=`mdi:eye`:t===`update`&&(r=`mdi:package-up`),this._haIcon.icon=r}}customElements.define(`ha-state-icon`,e)}if(!customElements.get(`ha-relative-time`)){class e extends HTMLElement{set datetime(e){this.textContent=e||``}set hass(e){}}customElements.define(`ha-relative-time`,e)}if(!customElements.get(`ha-svg-icon`)){class e extends HTMLElement{static get observedAttributes(){return[`path`,`viewBox`]}_path=``;_viewBox=`0 0 24 24`;_pathEl=null;_svgEl=null;constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`
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
				`,this._svgEl=e.querySelector(`svg`),this._pathEl=e.querySelector(`path`)}set path(e){this._path=e||``,this._pathEl&&this._pathEl.setAttribute(`d`,this._path)}get path(){return this._path}set viewBox(e){this._viewBox=e||`0 0 24 24`,this._svgEl&&this._svgEl.setAttribute(`viewBox`,this._viewBox)}get viewBox(){return this._viewBox}attributeChangedCallback(e,t,n){e===`path`&&(this.path=n),e===`viewBox`&&(this.viewBox=n)}}customElements.define(`ha-svg-icon`,e)}class e extends HTMLElement{_val=``;_checked=!1;_disabled=!1;_selected=!1;hass=null;config=null;constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`<slot></slot>`}get value(){return this._val}set value(e){this._val=e}get checked(){return this._checked}set checked(e){this._checked=!!e}get disabled(){return this._disabled}set disabled(e){this._disabled=!!e}get selected(){return this._selected}set selected(e){this._selected=!!e}setConfig(e){this.config=e}}for(let t of`ha-ripple.ha-tile-icon.ha-tile-info.ha-tile-badge.hui-card-features.hui-card-features-editor.ha-button.ha-icon-button.ha-alert.ha-circular-progress.ha-button-menu.ha-dropdown.ha-dropdown-item.mwc-list.mwc-list-item.mwc-menu.mwc-button.mwc-icon-button.mwc-ripple.mwc-switch.mwc-tab.mwc-tab-bar.ha-switch.ha-textfield.ha-select.ha-dialog.ha-slider.ha-bar.ha-combo-box.hui-conditional-base.ha-form`.split(`.`))if(!customElements.get(t))try{customElements.define(t,class extends e{})}catch{}}async function l(t=!1){if(e(i)&&!t)return e(r);try{let e=await fetch(`${n}/_api/custom_cards`);if(e.ok){let t=await e.json();return r.set(t),i.set(!0),t}}catch(e){console.error(`Failed to fetch custom cards:`,e)}return e(r)}async function u(e,t,r){try{let i=await fetch(`${n}/_api/custom_cards/install`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({url:e,name:t,tag:r})});if(i.ok){let e=await i.json();return await l(!0),{ok:!0,card:e.card}}let a=`Instalacija nije uspjela.`;try{let e=await i.json();a=e.message||e.error||a}catch{a=await i.text()||a}return{ok:!1,error:a}}catch(e){return{ok:!1,error:e?.message||`Install failed`}}}async function d(e){try{if((await fetch(`${n}/_api/custom_cards?id=${encodeURIComponent(e)}`,{method:`DELETE`})).ok)return await l(!0),!0}catch(e){console.error(`Failed to delete custom card:`,e)}return!1}function f(e){if(customElements.get(e))return!0;let t=[e.replace(/-card-bundle$/,``),e.replace(/-bundle$/,``),e.replace(/-card$/,``),`${e}-card`];for(let n of t){let t=customElements.get(n);if(n!==e&&t)try{return customElements.define(e,class extends t{}),!0}catch{}}let n=window.customCards;if(Array.isArray(n))for(let t of n){let n=t.type?.replace(/^custom:/,``),r=n?customElements.get(n):void 0;if(n&&r&&(n===e||e.includes(n)||n.includes(e)||e.replace(/[-_]/g,``)===n.replace(/[-_]/g,``)))try{return customElements.define(e,class extends r{}),!0}catch{}}return!1}async function p(e,t){if(typeof window>`u`||typeof customElements>`u`)return!1;if(c(),f(t))return!0;if(!o.has(e)){let r=`${n}/_api/custom_cards/file?name=${encodeURIComponent(e)}`;o.set(e,new Promise(n=>{let i=document.createElement(`script`);i.type=`module`,i.src=r;let s=setTimeout(()=>{n(f(t))},8e3);i.onload=async()=>{clearTimeout(s),a.add(e);try{await Promise.race([customElements.whenDefined(t),new Promise(e=>setTimeout(e,1e3))])}catch{}n(f(t))},i.onerror=()=>{clearTimeout(s),o.delete(e),console.error(`Failed to load custom card script: ${r}`),n(!1)},document.head.appendChild(i)}))}return await o.get(e),f(t)}export{c as a,l as i,d as n,u as o,p as r,r as t};