import { a6 as attr, a2 as attr_style, a7 as bind_props, N as derived, a1 as store_get, a4 as unsubscribe_stores } from './server.js-BOvgs2T9.js';
import { j as editMode } from './Stores.js-BlE1VWkf.js';
import './Icon.js-cvgngKMY.js';
import './index-server.js-DSnwhUjk.js';

//#region src/lib/Main/Camera/Proxy.svelte
function Proxy($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { sel, entity, size, stream_url, effective_stream_type = void 0, loaderVisible = void 0, responsive = void 0, muted = true } = $$props;
		let entity_picture = derived(() => entity?.attributes?.entity_picture || "");
		let proxy_stream = derived(() => (!muted || sel?.stream) && !effective_stream_type && !stream_url && !store_get($$store_subs ??= {}, "$editMode", editMode));
		$$renderer.push(`<img${attr("src", proxy_stream() ? entity_picture()?.replace("/camera_proxy/", "/camera_proxy_stream/") : entity_picture() ? `${entity_picture()}` : "about:blank")} draggable="false" alt="" class="svelte-1os43n1"${attr_style("", {
			display: "initial",
			width: responsive ? "100%" : "calc(14.5rem * 2 + 0.4rem)",
			"object-fit": size,
			position: loaderVisible && proxy_stream() ? "absolute" : "relative"
		})} onerror="this.__e=event" onload="this.__e=event"/> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { loaderVisible });
	});
}

export { Proxy as default };
//# sourceMappingURL=Proxy.js-CxBy5cWd.js.map
