import { o as onDestroy } from './index-server.js-DSnwhUjk.js';
import { a0 as store_set, a1 as store_get, a4 as unsubscribe_stores, a9 as attr_class, N as derived, a6 as attr } from './server.js-BOvgs2T9.js';
import { e as drawerSearch, F as focusSearch, o as lang } from './Stores.js-BlE1VWkf.js';
import './Modals.js-wqY8ZQIZ.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';

//#region src/lib/Components/InputClear.svelte
function InputClear($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { condition, select = false, children } = $$props;
		let padding = derived(() => condition ? "0.9em 2.5rem 0.9em 0.9em" : "0.9em");
		$$renderer.push(`<div class="clear svelte-nckdnz">`);
		children($$renderer, padding());
		$$renderer.push(`<!----> `);
		if (condition) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<button tabindex="-1"${attr_class("svelte-nckdnz", void 0, { "select": select })}>`);
			Icon($$renderer, {
				icon: "mingcute:close-fill",
				height: "auto",
				width: "100%"
			});
			$$renderer.push(`<!----></button>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (condition && select) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="divider svelte-nckdnz"></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/lib/Drawer/SearchInput.svelte
function SearchInput($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		/**
		* Clear $drawerSearch` onDestroy
		*/
		onDestroy(() => {
			store_set(drawerSearch, void 0);
			store_set(focusSearch, false);
		});
		InputClear($$renderer, {
			condition: store_get($$store_subs ??= {}, "$drawerSearch", drawerSearch),
			children: ($$renderer) => {
				$$renderer.push(`<input type="text" class="input"${attr("value", store_get($$store_subs ??= {}, "$drawerSearch", drawerSearch))} name="filter"${attr("placeholder", store_get($$store_subs ??= {}, "$lang", lang)("search"))} autocomplete="off" spellcheck="false"/> `);
				$$renderer.push(`<style>
		.input {
			padding: 0 0.9em;
			border-radius: 0.6em;
			border: 1px solid rgba(255, 255, 255, 0.2);
			background-color: rgba(0, 0, 0, 0.2);
			color: white;
			font-family: inherit;
			font-size: inherit;
			height: 100%;
			min-width: 5.5rem;
		}

		.clear {
			position: relative;
		}

		.clear > button {
			background: none;
			color: rgba(255, 255, 255, 0.9);
			font-size: 1.25rem;
			border: none;
			cursor: pointer;
			position: absolute;
			top: 0;
			right: 0;
			width: 2.8rem;
			height: 100%;
		}

		.clear > input {
			padding-right: 2.5rem;
			border: 1px solid rgba(255, 255, 255, 0.3);
		}

		.clear > input::placeholder {
			color: rgba(255, 255, 255, 0.35);
			opacity: 1;
		}

		/* Phone */
		@media all and (max-width: 768px) {
			.input {
				height: 2.8rem;
				width: 100%;
				max-width: unset;
			}

			.clear {
				max-width: unset;
			}
		}
	</style>`);
			}});
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}

export { SearchInput as default };
//# sourceMappingURL=SearchInput.js-B5fBky3X.js.map
