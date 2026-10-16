import { a2 as attr_style, a3 as stringify, a1 as store_get, $ as escape_html, a4 as unsubscribe_stores } from './server.js-BOvgs2T9.js';
import { m as motion, o as lang } from './Stores.js-BlE1VWkf.js';
import './Modals.js-wqY8ZQIZ.js';
import './internal2.js-Bl-t8u3P.js';
import './routing.js-ByECX1zD.js';
import './utils.js-DLsluu6x.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';
import './events.js-Bwaf7CDL.js';
import './shared.js-D28eHxhC.js';
import './index-server.js-DSnwhUjk.js';

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

export { SaveButton as default };
//# sourceMappingURL=SaveButton.js-CtEzzB-0.js.map
