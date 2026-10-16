import { $ as escape_html } from './server.js-BOvgs2T9.js';
import { x as getName } from './Stores.js-BlE1VWkf.js';
import { I as Icon } from './Icon.js-cvgngKMY.js';
import { S as StateLogic } from './StateLogic.js-gg5W59r3.js';
import './index-server.js-DSnwhUjk.js';

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

export { Info as default };
//# sourceMappingURL=Info.js-H_9wBeBA.js.map
