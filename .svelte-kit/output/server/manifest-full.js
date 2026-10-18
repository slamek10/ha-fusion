export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["apple-touch-icon.png","documentation/Developer.md","documentation/Documentation.md","documentation/Map.md","favicon.ico","favicon.png","icon-192.png","loader.svg","manifest.json","preview.png","robots.txt","themes/contrast.yaml","themes/contrast_thumbnail.webp","themes/godis.yaml","themes/godis_background.webp","themes/godis_thumbnail.webp","themes/muted.yaml","themes/muted_background.webp","themes/muted_thumbnail.webp","themes/playground/category.yaml","themes/serene.yaml","themes/serene_background.webp","translations/af.json","translations/ar.json","translations/bg.json","translations/bn.json","translations/bs.json","translations/ca.json","translations/cs.json","translations/cy.json","translations/da.json","translations/de.json","translations/el.json","translations/en-GB.json","translations/en.json","translations/eo.json","translations/es-419.json","translations/es.json","translations/et.json","translations/eu.json","translations/fa.json","translations/fi.json","translations/fr.json","translations/fy.json","translations/ga.json","translations/gl.json","translations/gsw.json","translations/he.json","translations/hi.json","translations/hr.json","translations/hu.json","translations/hy.json","translations/id.json","translations/is.json","translations/it.json","translations/ja.json","translations/ka.json","translations/ko.json","translations/lb.json","translations/lt.json","translations/lv.json","translations/mk.json","translations/ml.json","translations/nb.json","translations/nl.json","translations/nn.json","translations/no.json","translations/pl.json","translations/pt-BR.json","translations/pt.json","translations/ro.json","translations/ru.json","translations/sk.json","translations/sl.json","translations/sr-Latn.json","translations/sr.json","translations/sv.json","translations/ta.json","translations/te.json","translations/th.json","translations/tr.json","translations/uk.json","translations/ur.json","translations/vi.json","translations/zh-Hans.json","translations/zh-Hant.json","translations/zh.json","weather/meteocons/README.md","weather/meteocons/clear-night-day.svg","weather/meteocons/clear-night-night.svg","weather/meteocons/cloudy-day.svg","weather/meteocons/cloudy-night.svg","weather/meteocons/exceptional-day.svg","weather/meteocons/exceptional-night.svg","weather/meteocons/fog-day.svg","weather/meteocons/fog-night.svg","weather/meteocons/hail-day.svg","weather/meteocons/hail-night.svg","weather/meteocons/lightning-day.svg","weather/meteocons/lightning-night.svg","weather/meteocons/lightning-rainy-day.svg","weather/meteocons/lightning-rainy-night.svg","weather/meteocons/partlycloudy-day.svg","weather/meteocons/partlycloudy-night.svg","weather/meteocons/pouring-day.svg","weather/meteocons/pouring-night.svg","weather/meteocons/rainy-day.svg","weather/meteocons/rainy-night.svg","weather/meteocons/snowy-day.svg","weather/meteocons/snowy-night.svg","weather/meteocons/snowy-rainy-day.svg","weather/meteocons/snowy-rainy-night.svg","weather/meteocons/sunny-day.svg","weather/meteocons/sunny-night.svg","weather/meteocons/windy-day.svg","weather/meteocons/windy-night.svg","weather/meteocons/windy-variant-day.svg","weather/meteocons/windy-variant-night.svg"]),
	mimeTypes: {".png":"image/png",".md":"text/markdown",".svg":"image/svg+xml",".json":"application/json",".txt":"text/plain",".yaml":"text/yaml",".webp":"image/webp"},
	_: {
		client: {start:"_app/immutable/entry/start.BOzZAMmp.js",app:"_app/immutable/entry/app.CDjto5Eb.js",imports:["_app/immutable/entry/start.BOzZAMmp.js","_app/immutable/chunks/Crstj2o4.js","_app/immutable/chunks/Cm_oQ0TZ.js","_app/immutable/entry/app.CDjto5Eb.js","_app/immutable/chunks/Cm_oQ0TZ.js","_app/immutable/chunks/HclGiUj8.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/_api/bills",
				pattern: /^\/_api\/bills\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/bills/_server.ts.js'))
			},
			{
				id: "/_api/bills/file",
				pattern: /^\/_api\/bills\/file\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/bills/file/_server.ts.js'))
			},
			{
				id: "/_api/bills/scan",
				pattern: /^\/_api\/bills\/scan\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/bills/scan/_server.ts.js'))
			},
			{
				id: "/_api/bills/upload",
				pattern: /^\/_api\/bills\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/bills/upload/_server.ts.js'))
			},
			{
				id: "/_api/button_templates",
				pattern: /^\/_api\/button_templates\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/button_templates/_server.ts.js'))
			},
			{
				id: "/_api/custom_cards",
				pattern: /^\/_api\/custom_cards\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/custom_cards/_server.ts.js'))
			},
			{
				id: "/_api/custom_cards/file",
				pattern: /^\/_api\/custom_cards\/file\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/custom_cards/file/_server.ts.js'))
			},
			{
				id: "/_api/custom_cards/install",
				pattern: /^\/_api\/custom_cards\/install\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/custom_cards/install/_server.ts.js'))
			},
			{
				id: "/_api/custom_css",
				pattern: /^\/_api\/custom_css\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/custom_css/_server.ts.js'))
			},
			{
				id: "/_api/custom_js",
				pattern: /^\/_api\/custom_js\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/custom_js/_server.ts.js'))
			},
			{
				id: "/_api/get_all_themes",
				pattern: /^\/_api\/get_all_themes\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/get_all_themes/_server.ts.js'))
			},
			{
				id: "/_api/get_calendar",
				pattern: /^\/_api\/get_calendar\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/get_calendar/_server.ts.js'))
			},
			{
				id: "/_api/get_docs",
				pattern: /^\/_api\/get_docs\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/get_docs/_server.ts.js'))
			},
			{
				id: "/_api/get_translation",
				pattern: /^\/_api\/get_translation\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/get_translation/_server.ts.js'))
			},
			{
				id: "/_api/list_languages",
				pattern: /^\/_api\/list_languages\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/list_languages/_server.ts.js'))
			},
			{
				id: "/_api/load_theme",
				pattern: /^\/_api\/load_theme\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/load_theme/_server.ts.js'))
			},
			{
				id: "/_api/log_backend",
				pattern: /^\/_api\/log_backend\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/log_backend/_server.ts.js'))
			},
			{
				id: "/_api/popups",
				pattern: /^\/_api\/popups\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/popups/_server.ts.js'))
			},
			{
				id: "/_api/save_config",
				pattern: /^\/_api\/save_config\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/save_config/_server.ts.js'))
			},
			{
				id: "/_api/save_dashboard",
				pattern: /^\/_api\/save_dashboard\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/save_dashboard/_server.ts.js'))
			},
			{
				id: "/_api/version",
				pattern: /^\/_api\/version\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/version/_server.ts.js'))
			},
			{
				id: "/_api/waste_collection",
				pattern: /^\/_api\/waste_collection\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/waste_collection/_server.ts.js'))
			},
			{
				id: "/_api/waste_collection/ai_extract",
				pattern: /^\/_api\/waste_collection\/ai_extract\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/waste_collection/ai_extract/_server.ts.js'))
			},
			{
				id: "/_api/waste_collection/image",
				pattern: /^\/_api\/waste_collection\/image\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/waste_collection/image/_server.ts.js'))
			},
			{
				id: "/_api/waste_collection/upload",
				pattern: /^\/_api\/waste_collection\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/waste_collection/upload/_server.ts.js'))
			},
			{
				id: "/_api/youtube",
				pattern: /^\/_api\/youtube\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/_api/youtube/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
