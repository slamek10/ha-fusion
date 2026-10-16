import { f as store_get, h as unsubscribe_stores, j as escape_html, n as attr_style } from "./server.js";
import { x as lang } from "./Stores.js";
import "./Modals.js";
import "./paths.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Drawer/AppearanceButton.svelte
function AppearanceButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<button class="button"><figure${attr_style("", { "margin-right": "0.1rem" })}>`);
		Icon($$renderer, {
			icon: "material-symbols:invert-colors-rounded",
			height: "none"
		});
		$$renderer.push(`<!----></figure> <span>${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("appearance"))}</span></button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { AppearanceButton as default };
