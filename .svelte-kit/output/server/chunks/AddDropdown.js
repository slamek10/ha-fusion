import "./index-server.js";
import { f as store_get, h as unsubscribe_stores, j as escape_html } from "./server.js";
import { x as lang } from "./Stores.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Drawer/AddDropdown.svelte
function AddDropdown($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { view } = $$props;
		$$renderer.push(`<div class="container svelte-1tj3lob"><button class="button"><figure>`);
		Icon($$renderer, {
			icon: "gridicons:add-outline",
			height: "none"
		});
		$$renderer.push(`<!----></figure> <span>${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("add"))}</span></button> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { AddDropdown as default };
