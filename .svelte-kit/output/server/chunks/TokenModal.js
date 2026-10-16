import { n as onDestroy } from "./index-server.js";
import { A as attr, f as store_get, h as unsubscribe_stores, j as escape_html, m as stringify, n as attr_style, t as attr_class } from "./server.js";
import { S as motion, r as configuration, x as lang } from "./Stores.js";
import { r as modalsStore } from "./Modals.js";
import "./paths.js";
import { t as Icon } from "./Icon.js";
//#region src/lib/Modal/Index.svelte
function Index($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { backdropImage = true, size = void 0, ontransitionend = void 0, children, title } = $$props;
		let top = 0;
		window.innerHeight * .15;
		onDestroy(async () => {
			if (store_get($$store_subs ??= {}, "$modals", modalsStore).length === 0) document.body.style.overflow = "unset";
		});
		$$renderer.push(`<div role="dialog" class="svelte-1xke1o1"><div id="modal" class="svelte-1xke1o1"${attr_style("", {
			transform: `translateY(${stringify(top)}px)`,
			transition: `transform ${store_get($$store_subs ??= {}, "$motion", motion)}ms ease-out`
		})}><div${attr_class("contents svelte-1xke1o1", void 0, { "warning": !backdropImage })}${attr_style("", { width: size === "large" ? "80vw" : "40rem" })}><div class="header svelte-1xke1o1">`);
		if (title) {
			$$renderer.push("<!--[0-->");
			title($$renderer);
			$$renderer.push(`<!---->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <button aria-label="close" tabindex="-1" class="svelte-1xke1o1"${attr_style("", { outline: "none" })}>`);
		Icon($$renderer, {
			icon: "mingcute:close-fill",
			height: "none"
		});
		$$renderer.push(`<!----></button></div> <div class="body svelte-1xke1o1">`);
		if (children) {
			$$renderer.push("<!--[0-->");
			children($$renderer);
			$$renderer.push(`<!---->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div></div></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/Components/TokenModal.svelte
function TokenModal($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { isOpen } = $$props;
		let token = "";
		if (isOpen) {
			$$renderer.push("<!--[0-->");
			{
				function title($$renderer) {
					$$renderer.push(`<h1>${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("login"))}</h1>`);
				}
				Index($$renderer, {
					title,
					children: ($$renderer) => {
						$$renderer.push(`<div data-exclude-drag-modal="" class="svelte-ldbfou"><p>A <b>long-lived access token</b> is required for authentication when using both Ingress and the
				Home Assistant Companion app simultaneously.</p> <p>Open your user profile, <a${attr("href", `${stringify(store_get($$store_subs ??= {}, "$configuration", configuration)?.hassUrl)}/profile/security`)} target="_blank" class="svelte-ldbfou">${escape_html(store_get($$store_subs ??= {}, "$configuration", configuration)?.hassUrl)}/profile/security</a> to create and copy a new <b>long-lived access token</b>.</p></div> <form><h2>${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("token"))}</h2> <input class="input" type="password"${attr("value", token)}/> <button class="done action svelte-ldbfou" type="submit"${attr("disabled", true, true)}${attr_style("", { transition: `opacity ${stringify(store_get($$store_subs ??= {}, "$motion", motion))}ms ease` })}>${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("save"))}</button></form>`);
					},
					$$slots: {
						title: true,
						default: true
					}
				});
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { TokenModal as default };
