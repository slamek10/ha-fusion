import { a2 as attr_style, a3 as stringify, a1 as store_get, Y as await_block, X as ensure_array_like, a6 as attr, a4 as unsubscribe_stores } from './server.js-BOvgs2T9.js';
import { m as motion, d as dashboard, j as editMode } from './Stores.js-BlE1VWkf.js';
import './Modals.js-wqY8ZQIZ.js';
import './sortable.js-BM6fkpFL.js';
import 'sortablejs';

//#region src/lib/Sidebar/Index.svelte
function Index($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { altKeyPressed } = $$props;
		$$renderer.push(`<aside class="svelte-cbzmmy"${attr_style("", {
			padding: store_get($$store_subs ??= {}, "$dashboard", dashboard).hide_sidebar || store_get($$store_subs ??= {}, "$dashboard", dashboard).sidebar.length === 0 ? "0px" : "var(--theme-sidebar-padding)",
			transition: `padding ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease`
		})}>`);
		if (store_get($$store_subs ??= {}, "$editMode", editMode)) {
			$$renderer.push("<!--[0-->");
			await_block($$renderer, import('./ResizeHandle.js-BdnGIhip.js'), () => {}, (ResizeHandle) => {
				if (ResizeHandle.default) {
					$$renderer.push("<!--[-->");
					ResizeHandle.default($$renderer, {});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (!store_get($$store_subs ??= {}, "$dashboard", dashboard)?.hide_sidebar) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<section class="svelte-cbzmmy"><!--[-->`);
			const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$dashboard", dashboard).sidebar);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let item = each_array[$$index];
				$$renderer.push(`<div${attr("id", String(item.id))}${attr("data-id", item.id)} class="sidebar_edit_mode svelte-cbzmmy"${attr_style("", { display: item?.type === "divider" || item?.type === "date" || item?.type === "camera" || item?.type === "time" || item?.type === "notifications" || item?.type === "configure" ? "flex" : "initial" })}>`);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div>`);
			}
			$$renderer.push(`<!--]--></section> `);
			await_block($$renderer, import('./Toast.js-CmU95g2S.js'), () => {}, (Toast) => {
				if (Toast.default) {
					$$renderer.push("<!--[-->");
					Toast.default($$renderer, {});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			});
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></aside>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}

export { Index as default };
//# sourceMappingURL=Index3.js-DtmA-qYE.js.map
