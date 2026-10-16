import { h as unsubscribe_stores } from "./server.js";
import "./Stores.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Components/ResizeHandle.svelte
function ResizeHandle($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<div class="handle svelte-1kx1yg6"><div class="area svelte-1kx1yg6"></div></div> <div class="icon svelte-1kx1yg6">`);
		Icon($$renderer, {
			icon: "mdi:resize-bottom-right",
			height: "none"
		});
		$$renderer.push(`<!----></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { ResizeHandle as default };
