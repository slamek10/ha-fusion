import { n as onDestroy } from "./index-server.js";
import "./internal.js";
import "./server.js";
import "./paths.js";
//#region src/lib/Components/CustomCss.svelte
function CustomCss($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		onDestroy(() => {});
	});
}
//#endregion
export { CustomCss as default };
