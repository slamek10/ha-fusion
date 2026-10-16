import "../../chunks/index-server.js";
import { c as head, h as unsubscribe_stores } from "../../chunks/server.js";
import "../../chunks/Stores.js";
import { i as LegacyModals } from "../../chunks/Modals.js";
import { a as Loader } from "../../chunks/customCards.js";
//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { children } = $$props;
		head("12qhfyh", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>FUSION</title>`);
			});
			$$renderer.push(`<meta name="description" content="fusion"/> <meta charset="utf-8"/>`);
		});
		LegacyModals($$renderer, { $$slots: {
			backdrop: ($$renderer) => {
				$$renderer.push(`<div slot="backdrop" class="backdrop svelte-12qhfyh" role="button" tabindex="0"></div>`);
			},
			loading: ($$renderer) => {
				$$renderer.push(`<div slot="loading">`);
				Loader($$renderer, {});
				$$renderer.push(`<!----></div>`);
			}
		} });
		$$renderer.push(`<!----> `);
		children($$renderer);
		$$renderer.push(`<!---->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _layout as default };
