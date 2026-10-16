import { n as onDestroy } from "./index-server.js";
import { A as attr, f as store_get, h as unsubscribe_stores, m as stringify, n as attr_style, o as derived, p as store_set } from "./server.js";
import { S as motion, _ as history, c as dashboard, v as historyIndex, x as lang, y as historyUpdater } from "./Stores.js";
import "./Modals.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Drawer/HistoryButtons.svelte
function HistoryButtons($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		historyUpdater(snapshot);
		/**
		* Reactive statement to handle
		* changes to `$history` array
		*/
		let canUndo = derived(() => store_get($$store_subs ??= {}, "$historyIndex", historyIndex) > 0);
		let canRedo = derived(() => store_get($$store_subs ??= {}, "$historyIndex", historyIndex) < store_get($$store_subs ??= {}, "$history", history).length - 1);
		/**
		* Checks if a key exists directly on the
		* provided object or in its nested objects
		*/
		/**
		* Adds a snapshot of current dashboard to the history array
		*/
		function snapshot() {
			if (store_get($$store_subs ??= {}, "$historyIndex", historyIndex) < store_get($$store_subs ??= {}, "$history", history).length - 1) store_set(history, store_get($$store_subs ??= {}, "$history", history).slice(0, store_get($$store_subs ??= {}, "$historyIndex", historyIndex) + 1));
			const data = JSON.stringify(store_get($$store_subs ??= {}, "$dashboard", dashboard));
			if (store_get($$store_subs ??= {}, "$history", history).length === 0 || store_get($$store_subs ??= {}, "$history", history)[store_get($$store_subs ??= {}, "$history", history).length - 1] !== data) {
				store_set(history, [...store_get($$store_subs ??= {}, "$history", history), data]);
				store_set(historyIndex, store_get($$store_subs ??= {}, "$history", history).length - 1);
			}
		}
		/**
		* Resets history and associated variables
		*/
		onDestroy(() => {
			store_set(historyIndex, 0);
			store_set(history, []);
		});
		$$renderer.push(`<button class="button svelte-kbds9e"${attr("title", store_get($$store_subs ??= {}, "$lang", lang)("undo"))}${attr_style("", {
			cursor: canUndo() ? "pointer" : "unset",
			opacity: canUndo() ? "1" : "0.5",
			transition: `opacity ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
		})}><figure class="svelte-kbds9e">`);
		Icon($$renderer, {
			icon: "ion:arrow-undo-sharp",
			height: "none"
		});
		$$renderer.push(`<!----></figure></button> <button class="button svelte-kbds9e"${attr("title", store_get($$store_subs ??= {}, "$lang", lang)("forward"))}${attr_style("", {
			cursor: canRedo() ? "pointer" : "unset",
			opacity: canRedo() ? "1" : "0.5",
			transition: `opacity ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
		})}><figure class="svelte-kbds9e">`);
		Icon($$renderer, {
			icon: "ion:arrow-redo-sharp",
			height: "none"
		});
		$$renderer.push(`<!----></figure></button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { HistoryButtons as default };
