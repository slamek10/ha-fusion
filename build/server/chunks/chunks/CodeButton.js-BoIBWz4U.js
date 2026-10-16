import { $ as escape_html, a1 as store_get, a4 as unsubscribe_stores } from './server.js-BOvgs2T9.js';
import { o as lang } from './Stores.js-BlE1VWkf.js';
import './Modals.js-wqY8ZQIZ.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';
import './index-server.js-DSnwhUjk.js';

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

export { CodeButton as default };
//# sourceMappingURL=CodeButton.js-BoIBWz4U.js.map
