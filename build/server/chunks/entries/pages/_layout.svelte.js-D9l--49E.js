import { _ as head } from '../../chunks/server.js-BOvgs2T9.js';
import '../../chunks/Stores.js-BlE1VWkf.js';
import { L as LegacyModals } from '../../chunks/Modals.js-wqY8ZQIZ.js';
import { L as Loader } from '../../chunks/customCards.js-B9Gy0IKM.js';
import '../../chunks/internal2.js-Bl-t8u3P.js';
import '../../chunks/events.js-Bwaf7CDL.js';
import '../../chunks/routing.js-ByECX1zD.js';
import '../../chunks/utils.js-DLsluu6x.js';
import '../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
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
				Loader($$renderer);
				$$renderer.push(`<!----></div>`);
			}
		} });
		$$renderer.push(`<!----> `);
		children($$renderer);
		$$renderer.push(`<!---->`);
	});
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte.js-D9l--49E.js.map
