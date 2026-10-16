import './Stores.js-BlE1VWkf.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';
import './server.js-BOvgs2T9.js';
import './index-server.js-DSnwhUjk.js';

//#region src/lib/Components/ResizeHandle.svelte
function ResizeHandle($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="handle svelte-1kx1yg6"><div class="area svelte-1kx1yg6"></div></div> <div class="icon svelte-1kx1yg6">`);
		Icon($$renderer, {
			icon: "mdi:resize-bottom-right",
			height: "none"
		});
		$$renderer.push(`<!----></div>`);
	});
}

export { ResizeHandle as default };
//# sourceMappingURL=ResizeHandle.js-BdnGIhip.js.map
