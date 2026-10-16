import { f as store_get, h as unsubscribe_stores, j as escape_html, m as stringify, n as attr_style } from "./server.js";
import { S as motion, x as lang } from "./Stores.js";
import "./Modals.js";
import "./paths.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Drawer/SaveButton.svelte
function SaveButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { modified } = $$props;
		$$renderer.push(`<button class="button"${attr_style("", {
			opacity: modified ? "1" : "0.5",
			cursor: modified ? "pointer" : "unset",
			color: modified ? "#3b0f10" : "currentColor",
			"background-color": modified ? "#ffc107" : "var(--theme-drawer-button-background-color)",
			transition: `all ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
		})}><figure>`);
		Icon($$renderer, {
			icon: "ic:round-save",
			height: "none"
		});
		$$renderer.push(`<!----></figure> ${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("save"))}</button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { SaveButton as default };
