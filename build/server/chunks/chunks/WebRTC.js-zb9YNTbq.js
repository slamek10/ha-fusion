import { o as onDestroy } from './index-server.js-DSnwhUjk.js';
import { a6 as attr, a2 as attr_style, a1 as store_get, a4 as unsubscribe_stores, a7 as bind_props } from './server.js-BOvgs2T9.js';
import { j as editMode } from './Stores.js-BlE1VWkf.js';

//#region src/lib/Main/Camera/WebRTC.svelte
function WebRTC($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		/**
		* * generic camera integration
		*   - test with url: rtsp://rtsp-test-server.viomic.com:554/stream
		*   - feed will use hls initially
		*
		* * install go2rtc with docker
		*   - deploy 'alexxit/go2rtc' in host network mode
		*
		* Home Assistant's native WebRTC API uses a subscription to exchange the
		* initial answer and ICE candidates. The media stream itself remains peer
		* to peer between the browser and camera/provider.
		*/
		let { entity, stream_url = void 0, muted = true, loaderVisible = void 0, controls = false, responsive = void 0, size, debug, attachVideo, allowEditStream = false } = $$props;
		let peerConnection;
		let remoteStream;
		let unsubscribe;
		function detach() {
			const activeUnsubscribe = unsubscribe;
			unsubscribe = void 0;
			activeUnsubscribe?.then((unsubscribe) => unsubscribe()).catch((error) => console.error("Failed to close WebRTC signaling:", error));
			remoteStream?.getTracks().forEach((track) => track.stop());
			remoteStream = void 0;
			peerConnection?.close();
			peerConnection = void 0;
			stream_url = void 0;
			if (debug) console.debug("WebRTC detached:", entity?.entity_id);
		}
		onDestroy(() => detach());
		$$renderer.push(`<video${attr("muted", muted, true)}${attr("controls", controls, true)}${attr("autoplay", true, true)}${attr("playsinline", true, true)} class="svelte-auwulg"${attr_style("", {
			display: store_get($$store_subs ??= {}, "$editMode", editMode) && !allowEditStream ? "none" : "initial",
			visibility: stream_url ? "visible" : "hidden",
			width: responsive ? "100%" : "calc(14.5rem * 2 + 0.4rem)",
			"object-fit": size
		})}></video>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			stream_url,
			loaderVisible
		});
	});
}

export { WebRTC as default };
//# sourceMappingURL=WebRTC.js-zb9YNTbq.js.map
