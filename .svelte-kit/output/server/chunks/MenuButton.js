import "./index-server.js";
import { A as attr, f as store_get, h as unsubscribe_stores, m as stringify, n as attr_style } from "./server.js";
import { D as showDrawer, S as motion, x as lang } from "./Stores.js";
//#region src/lib/Drawer/MenuButton.svelte
function MenuButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { handleClick } = $$props;
		$$renderer.push(`<button${attr("title", store_get($$store_subs ??= {}, "$lang", lang)("menu"))} class="svelte-iffehs"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svelte-iffehs"${attr_style("", { "background-color": store_get($$store_subs ??= {}, "$showDrawer", showDrawer) ? "rgba(0, 0, 0, 0.2)" : "transparent" })}><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" class="svelte-iffehs"${attr_style("", {
			transform: `rotateX(${stringify(store_get($$store_subs ??= {}, "$showDrawer", showDrawer) ? 180 : 0)}deg)`,
			transition: `transform ${stringify(store_get($$store_subs ??= {}, "$motion", motion) / 1.3)}ms ease`
		})}></path></svg></button>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { MenuButton as default };
