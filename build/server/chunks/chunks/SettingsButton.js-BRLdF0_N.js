import { $ as escape_html, a1 as store_get, a4 as unsubscribe_stores } from './server.js-BOvgs2T9.js';
import { o as lang } from './Stores.js-BlE1VWkf.js';
import './Modals.js-wqY8ZQIZ.js';
import './internal2.js-Bl-t8u3P.js';
import './routing.js-ByECX1zD.js';
import './utils.js-DLsluu6x.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';
import './events.js-Bwaf7CDL.js';
import './shared.js-D28eHxhC.js';
import './index-server.js-DSnwhUjk.js';

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

export { SettingsButton as default };
//# sourceMappingURL=SettingsButton.js-BRLdF0_N.js.map
