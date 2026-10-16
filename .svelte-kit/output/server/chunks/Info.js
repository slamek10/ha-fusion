import { j as escape_html } from "./server.js";
import { F as getName } from "./Stores.js";
import { t as Icon } from "./Icon.js";
import { t as StateLogic } from "./StateLogic.js";
//#region src/lib/Main/Camera/Info.svelte
function Info($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { sel, entity } = $$props;
		$$renderer.push(`<div class="container svelte-hg0aal"><div class="left svelte-hg0aal"><div class="icon svelte-hg0aal">`);
		Icon($$renderer, {
			icon: "mdi:camera",
			height: "auto",
			width: "100%"
		});
		$$renderer.push(`<!----></div></div> <div class="right svelte-hg0aal"><div class="name svelte-hg0aal">${escape_html(getName(void 0, entity))}</div> <div class="state svelte-hg0aal">`);
		StateLogic($$renderer, {
			entity_id: sel?.entity_id,
			selected: sel
		});
		$$renderer.push(`<!----></div></div></div>`);
	});
}
//#endregion
export { Info as default };
