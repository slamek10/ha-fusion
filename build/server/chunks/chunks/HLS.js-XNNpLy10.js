import { o as onDestroy } from './index-server.js-DSnwhUjk.js';
import { a6 as attr, a2 as attr_style, a1 as store_get, a4 as unsubscribe_stores, a7 as bind_props } from './server.js-BOvgs2T9.js';
import { j as editMode } from './Stores.js-BlE1VWkf.js';

//#region src/lib/Main/Camera/HLS.svelte
function HLS($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		/**
		* https://github.com/video-dev/hls.js/blob/master/docs/API.md
		*
		* generic http camera
		* https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
		*/
		let { sel, entity, stream_url = void 0, size, loaderVisible = void 0, responsive = void 0, muted = true, controls = false, debug, attachVideo, allowEditStream = false } = $$props;
		let hls;
		function detach() {
			hls?.destroy();
			hls = void 0;
			stream_url = void 0;
		}
		onDestroy(() => detach());
		if (stream_url) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<video${attr("muted", muted, true)}${attr("controls", controls, true)} class="svelte-1qsxu66"${attr_style("", {
				display: store_get($$store_subs ??= {}, "$editMode", editMode) && !allowEditStream ? "none" : "initial",
				width: responsive ? "100%" : "calc(14.5rem * 2 + 0.4rem)",
				"object-fit": size
			})}></video>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			stream_url,
			loaderVisible
		});
	});
}

export { HLS as default };
//# sourceMappingURL=HLS.js-XNNpLy10.js.map
