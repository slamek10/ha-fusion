import { o as onDestroy } from './index-server.js-DSnwhUjk.js';
import './Stores.js-BlE1VWkf.js';
import './server.js-BOvgs2T9.js';

//#region src/lib/Sidebar/Toast.svelte
function Toast($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let timeout;
		onDestroy(() => clearTimeout(timeout));
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}

export { Toast as default };
//# sourceMappingURL=Toast.js-CmU95g2S.js.map
