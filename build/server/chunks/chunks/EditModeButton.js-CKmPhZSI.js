import { a2 as attr_style, a3 as stringify, a1 as store_get, $ as escape_html, a4 as unsubscribe_stores, N as derived } from './server.js-BOvgs2T9.js';
import { m as motion, j as editMode, o as lang } from './Stores.js-BlE1VWkf.js';
import './Modals.js-wqY8ZQIZ.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';
import './index-server.js-DSnwhUjk.js';

//#region src/lib/Drawer/EditModeButton.svelte
function EditModeButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { modified, toggleDrawer } = $$props;
		let text = derived(() => store_get($$store_subs ??= {}, "$lang", lang)(store_get($$store_subs ??= {}, "$editMode", editMode) ? "done" : "edit_ui"));
		$$renderer.push(`<button id="editmode" class="button"${attr_style("", {
			color: store_get($$store_subs ??= {}, "$editMode", editMode) ? "#3b0f10" : "inherit",
			"background-color": store_get($$store_subs ??= {}, "$editMode", editMode) ? "#ffc107" : "var(--theme-drawer-button-background-color)",
			width: `${stringify(1)}px`,
			transition: `all ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
		})}><figure>`);
		Icon($$renderer, {
			icon: "solar:pen-2-bold-duotone",
			height: "none"
		});
		$$renderer.push(`<!----></figure> <span>${escape_html(text())}</span></button> <button class="button"${attr_style("", {
			position: "absolute",
			visibility: "hidden",
			"pointer-events": "none"
		})}><figure>`);
		Icon($$renderer, {
			icon: "solar:pen-2-bold-duotone",
			height: "none"
		});
		$$renderer.push(`<!----></figure> <span>${escape_html(text())}</span></button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}

export { EditModeButton as default };
//# sourceMappingURL=EditModeButton.js-CKmPhZSI.js.map
