import { o as onDestroy } from '../../chunks/index-server.js-DSnwhUjk.js';
import { b as base } from '../../chunks/internal.js-BfbJWvIq.js';
import { a0 as store_set, a1 as store_get, a2 as attr_style, a3 as stringify, Y as await_block, a4 as unsubscribe_stores, _ as head, a5 as html, a6 as attr, a7 as bind_props, N as derived } from '../../chunks/server.js-BOvgs2T9.js';
import { c as configuration, d as dashboard, t as translation, s as selectedLanguage, a as customJs, y as youtubeAddon, b as currentViewId, m as motion, e as drawerSearch, f as filterDashboard, g as showDrawer, h as connection, i as disableMenuButton, j as editMode, k as clickOriginatedFromMenu } from '../../chunks/Stores.js-BlE1VWkf.js';
import '../../chunks/Modals.js-wqY8ZQIZ.js';
import '../../chunks/internal2.js-Bl-t8u3P.js';
import '../../chunks/routing.js-ByECX1zD.js';
import '../../chunks/utils.js-DLsluu6x.js';
import 'home-assistant-js-websocket';
import '../../chunks/events.js-Bwaf7CDL.js';
import '../../chunks/shared.js-D28eHxhC.js';

//#endregion
//#region src/lib/Components/Theme.svelte
function Theme($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { initial = void 0 } = $$props;
		let css = derived(() => {
			const result = Object.entries(initial?.theme || {}).map(([key, value]) => {
				if (typeof value === "string" && value.includes("/themes/")) value = value.replace("/", `${base}/`);
				return `--theme-${key}: ${value};`;
			}).join(" ");
			if (store_get($$store_subs ??= {}, "$dashboard", dashboard)?.theme && false);
			return result;
		});
		head("1ei9tod", $$renderer, ($$renderer) => {
			$$renderer.push(`${html(`<style>:root {${css()}}</style>`)} <meta name="theme-color"${attr("content", initial?.theme?.["app-color"])}/>`);
		});
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { initial });
	});
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		/**
		* Data from server-side load
		* function +page.server.ts
		*/
		let { data } = $$props;
		let altKeyPressed = false;
		store_set(configuration, data?.configuration);
		store_set(dashboard, data?.dashboard);
		store_set(translation, data?.translations);
		store_set(selectedLanguage, data?.configuration?.locale || "en");
		store_set(customJs, data?.configuration?.custom_js);
		store_set(youtubeAddon, data?.configuration?.addons?.youtube);
		store_set(currentViewId, store_get($$store_subs ??= {}, "$dashboard", dashboard)?.views?.[0]?.id);
		const _motion = data?.configuration?.motion;
		store_set(motion, _motion === void 0 || _motion === true ? store_get($$store_subs ??= {}, "$motion", motion) : 0);
		/**
		* Computes the current view.
		*
		* filterDashboard is filtered from search input, else
		* find `$currentViewId` OR when dragging get `isDndShadowItem`
		*/
		let view = derived(() => store_get($$store_subs ??= {}, "$drawerSearch", drawerSearch) ? store_get($$store_subs ??= {}, "$filterDashboard", filterDashboard) : store_get($$store_subs ??= {}, "$dashboard", dashboard)?.views?.find((view) => view?.id === store_get($$store_subs ??= {}, "$currentViewId", currentViewId)) || store_get($$store_subs ??= {}, "$dashboard", dashboard)?.views?.find((view) => view?.isDndShadowItem));
		let retryInterval;
		onDestroy(() => clearInterval(retryInterval));
		/**
		* Toggles drawer visibility and resets
		* the `$clickOriginatedFromMenu` flag.
		*/
		function toggleDrawer() {
			store_set(showDrawer, !store_get($$store_subs ??= {}, "$showDrawer", showDrawer));
			store_set(clickOriginatedFromMenu, false);
		}
		/**
		* If in edit mode, toggle editMode by programmatically clicking `EditModeButton`
		* to trigger any potential confirm dialogs. Else toggle drawer normally.
		*/
		function handleClick() {
			if (store_get($$store_subs ??= {}, "$editMode", editMode)) {
				store_set(clickOriginatedFromMenu, true);
				document.querySelector("#editmode")?.click();
			} else toggleDrawer();
		}
		Theme($$renderer, { initial: data?.theme });
		$$renderer.push(`<!----> <div id="layout" class="svelte-1uha8ag"${attr_style("", {
			"grid-template-columns": `${stringify(store_get($$store_subs ??= {}, "$dashboard", dashboard)?.hide_sidebar || !store_get($$store_subs ??= {}, "$dashboard", dashboard)?.sidebar?.length ? "0" : store_get($$store_subs ??= {}, "$dashboard", dashboard)?.sidebarWidth || 210)}px auto`,
			"grid-template-rows": store_get($$store_subs ??= {}, "$showDrawer", showDrawer) ? "auto auto 1fr" : "0fr auto 1fr",
			transition: `grid-template-rows ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease, grid-template-columns ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
		})}>`);
		await_block($$renderer, import('../../chunks/Views.js-gdQeOEIX.js'), () => {}, (Views) => {
			if (Views.default) {
				$$renderer.push("<!--[-->");
				Views.default($$renderer, { view: view() });
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		});
		$$renderer.push(`<!--]--> `);
		if (view()?.sections) {
			$$renderer.push("<!--[0-->");
			await_block($$renderer, import('../../chunks/Index2.js-BpzblyO-.js'), () => {}, (Main) => {
				if (Main.default) {
					$$renderer.push("<!--[-->");
					Main.default($$renderer, {
						view: view(),
						altKeyPressed
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]-->`);
		} else if (store_get($$store_subs ??= {}, "$connection", connection)) {
			$$renderer.push("<!--[1-->");
			await_block($$renderer, import('../../chunks/Intro.js-DVPbGyXd.js'), () => {}, (Intro) => {
				if (Intro.default) {
					$$renderer.push("<!--[-->");
					Intro.default($$renderer, { data });
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		await_block($$renderer, import('../../chunks/Index3.js-DtmA-qYE.js'), () => {}, (Sidebar) => {
			if (Sidebar.default) {
				$$renderer.push("<!--[-->");
				Sidebar.default($$renderer, { altKeyPressed });
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		});
		$$renderer.push(`<!--]--> `);
		if (!store_get($$store_subs ??= {}, "$disableMenuButton", disableMenuButton)) {
			$$renderer.push("<!--[0-->");
			await_block($$renderer, import('../../chunks/MenuButton.js-FZJ3CAwm.js'), () => {}, (MenuButton) => {
				if (MenuButton.default) {
					$$renderer.push("<!--[-->");
					MenuButton.default($$renderer, { handleClick });
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (store_get($$store_subs ??= {}, "$showDrawer", showDrawer)) {
			$$renderer.push("<!--[0-->");
			await_block($$renderer, import('../../chunks/Index.js-ua67P5Ip.js'), () => {}, (Drawer) => {
				if (Drawer.default) {
					$$renderer.push("<!--[-->");
					Drawer.default($$renderer, {
						view: view(),
						data,
						toggleDrawer
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (store_get($$store_subs ??= {}, "$customJs", customJs)) {
			$$renderer.push("<!--[0-->");
			await_block($$renderer, import('../../chunks/CustomJs.js-D-IrM_NB.js'), () => {}, (CustomJs) => {
				if (CustomJs.default) {
					$$renderer.push("<!--[-->");
					CustomJs.default($$renderer, {});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		await_block($$renderer, import('../../chunks/CustomCss.js-CNVY4i4u.js'), () => {}, (CustomCss) => {
			if (CustomCss.default) {
				$$renderer.push("<!--[-->");
				CustomCss.default($$renderer, {});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		});
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-DxCuMDQ6.js.map
