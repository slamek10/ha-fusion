import { n as onDestroy } from "./index-server.js";
import { h as unsubscribe_stores } from "./server.js";
import "./Stores.js";
//#region src/lib/Sidebar/Toast.svelte
function Toast($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let timeout;
		onDestroy(() => clearTimeout(timeout));
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { Toast as default };
