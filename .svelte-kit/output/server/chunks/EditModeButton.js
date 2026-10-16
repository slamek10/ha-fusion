import "./index-server.js";
import { f as store_get, h as unsubscribe_stores, j as escape_html, m as stringify, n as attr_style, o as derived } from "./server.js";
import { S as motion, f as editMode, x as lang } from "./Stores.js";
import "./Modals.js";
import { t as Icon } from "./Icon.js";
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
//#endregion
export { EditModeButton as default };
