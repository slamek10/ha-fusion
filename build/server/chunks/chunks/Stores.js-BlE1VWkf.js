import { U as writable, T as readable, V as derived$1 } from './server.js-BOvgs2T9.js';

/**
* Returns the domain from a given entity_id
* @example domain("light.bedroom") // "light"
*/
function getDomain(entity_id) {
	return entity_id?.split(".")?.[0];
}
/**
* Returns the name of a given entity
* name | friendly_name | entity_id
*/
function getName(sel, entity, sectionName = void 0) {
	const name = sel?.name || entity?.attributes?.friendly_name || entity?.entity_id?.split(".")?.[1];
	return !sel?.name && sectionName && name?.startsWith(sectionName + " ") ? name?.substring(sectionName?.length + 1) : name;
}
/**
* Domains that default to display-only buttons unless overridden per button.
* Domains without a togglable service (climate, alarm_control_panel, camera...)
* must not be listed here; they are interactive through their modals.
*/
function isDisplayOnlyDomain(entity_id) {
	const domain = getDomain(entity_id);
	if (!domain) return false;
	return [
		"sensor",
		"binary_sensor",
		"weather",
		"sun",
		"date",
		"time",
		"person",
		"zone",
		"device_tracker"
	].includes(domain);
}
/**
* Check if given string is a timestamp
* YYYY-MM-DDTHH:MM:SS
*/
function isTimestamp(state) {
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(state) && !isNaN(new Date(state).getTime());
}
/**
* Converts an ISO formatted timestamp
* into a relative time string
*/
function relativeTime(timestamp, languageCode) {
	const date = new Date(timestamp);
	if (isNaN(date.getTime())) {
		console.error(`Invalid timestamp: ${timestamp}`);
		return timestamp;
	}
	const formatter = new Intl.RelativeTimeFormat(languageCode, { numeric: "auto" });
	let index;
	const units = [
		["second", 60],
		["minute", 60],
		["hour", 24],
		["day", 30],
		["month", 12],
		["year", Infinity]
	];
	const now = /* @__PURE__ */ new Date();
	const diff = (date.getTime() - now.getTime()) / 1e3;
	let diffUnit = Math.abs(diff);
	for (index = 0; index < units.length - 1; index++) {
		if (diffUnit < units[index][1]) break;
		diffUnit /= units[index][1];
	}
	return formatter.format(Math.round(diffUnit) * (diff < 0 ? -1 : 1), units[index][0]);
}
//#endregion
//#region src/lib/Stores.ts
var connection = writable();
var states = writable();
var configuration = writable();
var dashboard = writable();
var customJs = writable();
readable([
	"active",
	"auto",
	"cool",
	"dry",
	"fan_only",
	"heat",
	"heat_cool",
	"heating",
	"home",
	"on",
	"open",
	"playing",
	"unlocking",
	"unlocked",
	"cleaning",
	"returning",
	"eco",
	"electric",
	"performance",
	"high_demand",
	"heat_pump",
	"gas"
]);
readable({
	cooling: "cool",
	drying: "dry",
	fan: "fan_only",
	preheating: "heat",
	heating: "heat",
	idle: "off",
	off: "off"
});
var drawerSearch = writable();
var focusSearch = writable(false);
var filterDashboard = writable({});
var disableMenuButton = writable(false);
var clickOriginatedFromMenu = writable(false);
var editMode = writable(false);
var showDrawer = writable(false);
var motion = writable(190);
var itemHeight = readable(50);
var translation = writable({});
var selectedLanguage = writable();
var lang = derived$1(translation, (obj) => (key) => obj[key] || obj._default?.[key] || key);
var currentViewId = writable();
var draggingView = writable(false);
var viewUnderline = writable(true);
var highlightView = writable(false);
var templates = writable({});
var youtubeAddon = writable();
var history = writable([]);
var historyIndex = writable(0);
var record = writable(() => {});
function historyUpdater(func) {
	record.set(func);
}
var timer = readable(/* @__PURE__ */ new Date(), function start(set) {
	const interval = setInterval(() => {
		set(/* @__PURE__ */ new Date());
	}, 1e3);
	set(/* @__PURE__ */ new Date());
	return function stop() {
		clearInterval(interval);
	};
});
readable({
	color: "rgba(255, 255, 255, 0.15)",
	opacity: .5,
	spreadingDuration: "300ms",
	spreadingTimingFunction: "ease-in-out",
	clearingDuration: "350ms",
	clearingTimingFunction: "ease-in-out"
});
derived$1(states, ($states) => Object.keys($states ?? {}));
derived$1(states, ($states) => (filter) => Object.keys($states)?.filter((key) => filter.length > 0 ? key.startsWith(`${filter}.`) : true)?.sort()?.map((key) => {
	const name = getName(void 0, $states?.[key]);
	return {
		id: key,
		label: name ?? key,
		hint: name === key ? void 0 : key
	};
}));

export { templates as A, timer as B, history as C, historyIndex as D, historyUpdater as E, focusSearch as F, customJs as a, currentViewId as b, configuration as c, dashboard as d, drawerSearch as e, filterDashboard as f, showDrawer as g, connection as h, disableMenuButton as i, editMode as j, clickOriginatedFromMenu as k, highlightView as l, motion as m, draggingView as n, lang as o, getDomain as p, isTimestamp as q, relativeTime as r, selectedLanguage as s, translation as t, itemHeight as u, viewUnderline as v, states as w, getName as x, youtubeAddon as y, isDisplayOnlyDomain as z };
//# sourceMappingURL=Stores.js-BlE1VWkf.js.map
