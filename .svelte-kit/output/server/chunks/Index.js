import "./index-server.js";
import { f as store_get, h as unsubscribe_stores, i as await_block, o as derived, t as attr_class } from "./server.js";
import { _ as history, f as editMode, v as historyIndex } from "./Stores.js";
import "./Icon.js";
//#region src/lib/Drawer/Separator.svelte
function Separator($$renderer) {
	$$renderer.push(`<hr class="svelte-kl1ok6"/>`);
}
//#endregion
//#region src/lib/Drawer/Index.svelte
function Index($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { data, view, toggleDrawer } = $$props;
		/**
		* Determines whether the dashboard data has been modified,
		* property is passed to both `EditModeButton` and `SaveButton`
		*/
		let modified = derived(() => store_get($$store_subs ??= {}, "$history", history)?.[store_get($$store_subs ??= {}, "$historyIndex", historyIndex)] !== store_get($$store_subs ??= {}, "$history", history)?.[0]);
		$$renderer.push(`<header id="drawer" class="svelte-1f6evc1"><div${attr_class("svelte-1f6evc1", void 0, {
			"grid": !store_get($$store_subs ??= {}, "$editMode", editMode),
			"grid-editmode": store_get($$store_subs ??= {}, "$editMode", editMode)
		})}><div class="edit svelte-1f6evc1">`);
		await_block($$renderer, import("./EditModeButton.js"), () => {}, (EditModeButton) => {
			if (EditModeButton.default) {
				$$renderer.push("<!--[-->");
				EditModeButton.default($$renderer, {
					modified: modified(),
					toggleDrawer
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		});
		$$renderer.push(`<!--]--></div> `);
		if (store_get($$store_subs ??= {}, "$editMode", editMode)) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="add svelte-1f6evc1">`);
			await_block($$renderer, import("./AddDropdown.js"), () => {}, (AddDropdown) => {
				if (AddDropdown.default) {
					$$renderer.push("<!--[-->");
					AddDropdown.default($$renderer, { view });
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]--></div> <div class="appearance svelte-1f6evc1">`);
			await_block($$renderer, import("./AppearanceButton.js"), () => {}, (AppearanceButton) => {
				if (AppearanceButton.default) {
					$$renderer.push("<!--[-->");
					AppearanceButton.default($$renderer, {});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]--></div> <div class="history svelte-1f6evc1">`);
			await_block($$renderer, import("./HistoryButtons.js"), () => {}, (HistoryButtons) => {
				if (HistoryButtons.default) {
					$$renderer.push("<!--[-->");
					HistoryButtons.default($$renderer, {});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]--></div> <div class="save push svelte-1f6evc1">`);
			await_block($$renderer, import("./SaveButton.js"), () => {}, (SaveButton) => {
				if (SaveButton.default) {
					$$renderer.push("<!--[-->");
					SaveButton.default($$renderer, { modified: modified() });
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]--></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="code svelte-1f6evc1">`);
			await_block($$renderer, import("./CodeButton.js"), () => {}, (CodeButton) => {
				if (CodeButton.default) {
					$$renderer.push("<!--[-->");
					CodeButton.default($$renderer, {});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]--></div> `);
			Separator($$renderer, {});
			$$renderer.push(`<!----> <div class="search svelte-1f6evc1">`);
			await_block($$renderer, import("./SearchInput.js"), () => {}, (SearchInput) => {
				if (SearchInput.default) {
					$$renderer.push("<!--[-->");
					SearchInput.default($$renderer, {});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]--></div> <div class="settings push svelte-1f6evc1">`);
			await_block($$renderer, import("./SettingsButton.js"), () => {}, (SettingsButton) => {
				if (SettingsButton.default) {
					$$renderer.push("<!--[-->");
					SettingsButton.default($$renderer, { data });
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div></header>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { Index as default };
