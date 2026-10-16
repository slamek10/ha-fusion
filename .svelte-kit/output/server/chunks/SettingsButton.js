import { f as store_get, h as unsubscribe_stores, j as escape_html } from "./server.js";
import { x as lang } from "./Stores.js";
import "./Modals.js";
import "./paths.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Drawer/SettingsButton.svelte
function SettingsButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { data } = $$props;
		$$renderer.push(`<button class="button"><figure>`);
		Icon($$renderer, {
			icon: "clarity:settings-solid",
			height: "none"
		});
		$$renderer.push(`<!----></figure> <span>${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("settings"))}</span></button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { SettingsButton as default };
