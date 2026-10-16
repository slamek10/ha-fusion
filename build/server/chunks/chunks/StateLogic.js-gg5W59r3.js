import { $ as escape_html, a1 as store_get, Y as await_block, a5 as html, a4 as unsubscribe_stores, N as derived } from './server.js-BOvgs2T9.js';
import { s as selectedLanguage, j as editMode, p as getDomain, o as lang, q as isTimestamp, r as relativeTime } from './Stores.js-BlE1VWkf.js';

//#region src/lib/Components/StateLogic.svelte
function StateLogic($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { selected, contentWidth = void 0, entity_id } = $$props;
		let attributes = derived(() => void 0);
		let entityState = derived(() => void 0);
		let brightness = derived(() => attributes()?.brightness);
		let percentage = derived(() => attributes()?.percentage);
		let media_title = derived(() => attributes()?.media_title);
		if (selected?.attribute) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`${escape_html(void 0)}`);
		} else if (entityState() === "on" && brightness()) {
			$$renderer.push("<!--[1-->");
			const percentage = brightness() / 255;
			const floor = percentage < .01 && percentage > 0 ? .01 : percentage;
			$$renderer.push(`${escape_html(Intl.NumberFormat(store_get($$store_subs ??= {}, "$selectedLanguage", selectedLanguage), { style: "percent" }).format(floor))}`);
		} else if (media_title() && entityState() === "playing") {
			$$renderer.push("<!--[2-->");
			const title = `<span title=${media_title()}>${media_title()}</span>`;
			if (selected?.marquee === true && contentWidth && contentWidth > 153 && !store_get($$store_subs ??= {}, "$editMode", editMode)) {
				$$renderer.push("<!--[0-->");
				await_block($$renderer, import('./Marquee.js-DUj70MWd.js'), () => {
					$$renderer.push(`${html(title)}`);
				}, (Marquee) => {
					if (Marquee.default) {
						$$renderer.push("<!--[-->");
						Marquee.default($$renderer, {
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(media_title())} ${html("&nbsp;".repeat(4))}`);
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				});
				$$renderer.push(`<!--]-->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`${html(title)}`);
			}
			$$renderer.push(`<!--]-->`);
		} else if (getDomain(entity_id) === "climate" && attributes()?.hvac_action) {
			$$renderer.push("<!--[3-->");
			$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)(attributes()?.hvac_action))}`);
		} else if (getDomain(entity_id) === "update") {
			$$renderer.push("<!--[4-->");
			if (attributes()?.in_progress) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`${escape_html(typeof attributes()?.in_progress === "number" ? store_get($$store_subs ??= {}, "$lang", lang)("update_installing_progress").replace("{progress}", String(attributes()?.in_progress)) : store_get($$store_subs ??= {}, "$lang", lang)("update_installing"))}`);
			} else if (entityState() === "on") {
				$$renderer.push("<!--[1-->");
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("update_available"))}`);
			} else if (entityState() === "off") {
				$$renderer.push("<!--[2-->");
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("update_up_to_date"))}`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else if (getDomain(entity_id) === "automation" && false);
		else if (getDomain(entity_id) === "script" && false);
		else if (getDomain(entity_id) === "humidifier" && entityState() === "on" && attributes()?.action) {
			$$renderer.push("<!--[7-->");
			$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("humidifier_" + attributes()?.action))}`);
		} else if (getDomain(entity_id) === "water_heater") {
			$$renderer.push("<!--[8-->");
			$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("water_heater_" + entityState()))}`);
		} else if (entity_id && (getDomain(entity_id) === "input_number" || getDomain(entity_id) === "number")) {
			$$renderer.push("<!--[9-->");
			$$renderer.push(`${escape_html(Number(entityState()) || store_get($$store_subs ??= {}, "$lang", lang)("unknown"))} `);
			if (attributes()?.unit_of_measurement) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`${escape_html(attributes().unit_of_measurement)}`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else if (getDomain(entity_id) === "weather") {
			$$renderer.push("<!--[10-->");
			$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("weather_" + entityState()?.replace("_", "-")) || entityState() || store_get($$store_subs ??= {}, "$lang", lang)("unknown"))}`);
		} else if (getDomain(entity_id) === "input_text" || getDomain(entity_id) === "text") {
			$$renderer.push("<!--[11-->");
			if (entityState() === "unknown") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("unknown"))}`);
			} else if (entityState() === "") {
				$$renderer.push("<!--[1-->");
				$$renderer.push(`${html("&nbsp;")}`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`${escape_html(attributes()?.mode === "password" ? entityState().replace(/./g, "•") : entityState())}`);
			}
			$$renderer.push(`<!--]-->`);
		} else if (entityState() && isTimestamp(entityState())) {
			$$renderer.push("<!--[12-->");
			$$renderer.push(`${escape_html(relativeTime(entityState(), store_get($$store_subs ??= {}, "$selectedLanguage", selectedLanguage)))}`);
		} else if (entityState() === "on" && percentage()) {
			$$renderer.push("<!--[13-->");
			$$renderer.push(`${escape_html(Intl.NumberFormat(store_get($$store_subs ??= {}, "$selectedLanguage", selectedLanguage), { style: "percent" }).format(percentage() * .01))}`);
		} else if (entityState()) {
			$$renderer.push("<!--[14-->");
			if (selected?.marquee && contentWidth && contentWidth > 153 && !store_get($$store_subs ??= {}, "$editMode", editMode)) {
				$$renderer.push("<!--[0-->");
				await_block($$renderer, import('./Marquee.js-DUj70MWd.js'), () => {}, (Marquee) => {
					if (Marquee.default) {
						$$renderer.push("<!--[-->");
						Marquee.default($$renderer, {
							children: ($$renderer) => {
								$$renderer.push(`${html(store_get($$store_subs ??= {}, "$lang", lang)(entityState()))} `);
								if (attributes()?.unit_of_measurement) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`${escape_html(attributes().unit_of_measurement)}`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--> ${html("&nbsp;".repeat(4))}`);
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				});
				$$renderer.push(`<!--]-->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`${html(store_get($$store_subs ??= {}, "$lang", lang)(entityState()))} `);
				if (attributes()?.unit_of_measurement) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`${escape_html(attributes().unit_of_measurement)}`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$lang", lang)("unknown"))}`);
		}
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}

export { StateLogic as S };
//# sourceMappingURL=StateLogic.js-gg5W59r3.js.map
