import { f as store_get, h as unsubscribe_stores, j as escape_html } from "./server.js";
import { x as lang } from "./Stores.js";
import "./Modals.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Drawer/CodeButton.svelte
function CodeButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<button class="button"><figure>`);
		Icon($$renderer, {
			icon: "ph:code-bold",
			height: "none"
		});
		$$renderer.push(`<!----></figure> <span class="svelte-1lcp3iu">${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("code"))}</span></button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { CodeButton as default };
