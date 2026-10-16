import { a1 as store_get, a2 as attr_style, X as ensure_array_like, a6 as attr, a3 as stringify, $ as escape_html, a4 as unsubscribe_stores, a7 as bind_props, N as derived } from './server.js-BOvgs2T9.js';
import { d as dashboard, j as editMode, m as motion, b as currentViewId, l as highlightView, v as viewUnderline, n as draggingView, o as lang } from './Stores.js-BlE1VWkf.js';
import './Modals.js-wqY8ZQIZ.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';
import './sortable.js-BM6fkpFL.js';
import './index-server.js-DSnwhUjk.js';
import 'sortablejs';

//#region src/lib/Main/EditViewButton.svelte
function EditViewButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<button class="edit svelte-hc6aem">${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("edit_view"))}</button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/Main/EyeIndicator.svelte
function EyeIndicator($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { eyeWidth = void 0 } = $$props;
		$$renderer.push(`<button class="edit eye svelte-1ay0c6j">`);
		Icon($$renderer, {
			icon: "charm:eye-slash",
			height: "none"
		});
		$$renderer.push(`<!----></button>`);
		bind_props($$props, { eyeWidth });
	});
}
//#endregion
//#region src/lib/Main/Views.svelte
function Views($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { view } = $$props;
		let width = 0;
		let left = 0;
		/**
		* Compute width and left values on active view-button
		*/
		const borderStyle = "3px solid white";
		let editViewButtonWidth = 0;
		let eyeWidth = 0;
		let navWidth = derived(() => `calc(100vw - (${store_get($$store_subs ??= {}, "$dashboard", dashboard)?.sidebarWidth || 210}px + 1.25rem + ${eyeWidth || 0}px + ${editViewButtonWidth}px + 1.25rem + 0.1rem))`);
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<nav class="svelte-hbua67">`);
			if (store_get($$store_subs ??= {}, "$dashboard", dashboard).views.length === 0 ? false : store_get($$store_subs ??= {}, "$editMode", editMode) ? true : !store_get($$store_subs ??= {}, "$dashboard", dashboard)?.hide_views) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="svelte-hbua67">`);
				if (store_get($$store_subs ??= {}, "$editMode", editMode)) {
					$$renderer.push("<!--[0-->");
					EditViewButton($$renderer);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (store_get($$store_subs ??= {}, "$dashboard", dashboard)?.hide_views) {
					$$renderer.push("<!--[0-->");
					EyeIndicator($$renderer, {
						get eyeWidth() {
							return eyeWidth;
						},
						set eyeWidth($$value) {
							eyeWidth = $$value;
							$$settled = false;
						}
					});
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <div class="navigation-container svelte-hbua67"${attr_style("", { width: navWidth() })}><div class="fadecont"><div class="top-bar svelte-hbua67"><div id="navigation" class="svelte-hbua67"><!--[-->`);
				const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$dashboard", dashboard).views);
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let view = each_array[$$index];
					$$renderer.push(`<button${attr("data-id", view.id)}${attr("id", String(view.id))} class="nav-button svelte-hbua67"${attr_style("", {
						"border-bottom": (store_get($$store_subs ??= {}, "$highlightView", highlightView) || store_get($$store_subs ??= {}, "$viewUnderline", viewUnderline)) && store_get($$store_subs ??= {}, "$currentViewId", currentViewId) === view.id ? borderStyle : "3px solid transparent",
						opacity: store_get($$store_subs ??= {}, "$currentViewId", currentViewId) === view.id ? "1" : "0.25",
						transition: `opacity ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
					})}><div class="btn-content svelte-hbua67">${escape_html(view.name)}</div></button>`);
				}
				$$renderer.push(`<!--]--></div></div> <!---->`);
				$$renderer.push(`<div class="underline svelte-hbua67"${attr_style("", {
					width: `${stringify(width)}px`,
					left: `${stringify(left)}px`,
					opacity: store_get($$store_subs ??= {}, "$draggingView", draggingView) ? "0" : "1",
					transition: `width ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease, left ${stringify(store_get($$store_subs ??= {}, "$draggingView", draggingView) ? "0" : store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
				})}></div>`);
				$$renderer.push(`<!----></div></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></nav>`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}

export { Views as default };
//# sourceMappingURL=Views.js-gdQeOEIX.js.map
