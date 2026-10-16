import { n as onDestroy } from "./index-server.js";
import "./internal.js";
import "./server.js";
import "./paths.js";
//#region src/lib/Components/CustomJs.svelte
function CustomJs($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		onDestroy(() => {});
	});
}
//#endregion
export { CustomJs as default };
