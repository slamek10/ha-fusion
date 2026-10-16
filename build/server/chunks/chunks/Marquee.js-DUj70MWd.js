import { a9 as attr_class, X as ensure_array_like, a6 as attr, a2 as attr_style, a3 as stringify } from './server.js-BOvgs2T9.js';

//#region src/lib/Components/Marquee.svelte
function Marquee($$renderer, $$props) {
	let { duration = 15, repeat = 2, paused = false, pauseOnHover = false, children } = $$props;
	$$renderer.push(`<div role="none" class="svelte-1hhvqpo"><div${attr_class("content svelte-1hhvqpo", void 0, { "paused": paused || pauseOnHover && false })}><!--[-->`);
	const each_array = ensure_array_like(Array(repeat));
	for (let index = 0, $$length = each_array.length; index < $$length; index++) {
		let i = each_array[index];
		$$renderer.push(`<div class="text svelte-1hhvqpo"${attr("title", i)}${attr_style("", { "animation-duration": `${stringify(duration)}s` })}>`);
		children($$renderer);
		$$renderer.push(`<!----></div>`);
	}
	$$renderer.push(`<!--]--></div></div>`);
}

export { Marquee as default };
//# sourceMappingURL=Marquee.js-DUj70MWd.js.map
