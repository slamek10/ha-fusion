
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/_api" | "/_api/button_templates" | "/_api/custom_cards" | "/_api/custom_cards/file" | "/_api/custom_cards/install" | "/_api/custom_css" | "/_api/custom_js" | "/_api/get_all_themes" | "/_api/get_calendar" | "/_api/get_docs" | "/_api/get_translation" | "/_api/list_languages" | "/_api/load_theme" | "/_api/log_backend" | "/_api/popups" | "/_api/save_config" | "/_api/save_dashboard" | "/_api/version" | "/_api/waste_collection" | "/_api/waste_collection/ai_extract" | "/_api/waste_collection/image" | "/_api/waste_collection/upload" | "/_api/youtube";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/_api": Record<string, never>;
			"/_api/button_templates": Record<string, never>;
			"/_api/custom_cards": Record<string, never>;
			"/_api/custom_cards/file": Record<string, never>;
			"/_api/custom_cards/install": Record<string, never>;
			"/_api/custom_css": Record<string, never>;
			"/_api/custom_js": Record<string, never>;
			"/_api/get_all_themes": Record<string, never>;
			"/_api/get_calendar": Record<string, never>;
			"/_api/get_docs": Record<string, never>;
			"/_api/get_translation": Record<string, never>;
			"/_api/list_languages": Record<string, never>;
			"/_api/load_theme": Record<string, never>;
			"/_api/log_backend": Record<string, never>;
			"/_api/popups": Record<string, never>;
			"/_api/save_config": Record<string, never>;
			"/_api/save_dashboard": Record<string, never>;
			"/_api/version": Record<string, never>;
			"/_api/waste_collection": Record<string, never>;
			"/_api/waste_collection/ai_extract": Record<string, never>;
			"/_api/waste_collection/image": Record<string, never>;
			"/_api/waste_collection/upload": Record<string, never>;
			"/_api/youtube": Record<string, never>
		};
		Pathname(): "/" | "/_api/button_templates" | "/_api/custom_cards" | "/_api/custom_cards/file" | "/_api/custom_cards/install" | "/_api/custom_css" | "/_api/custom_js" | "/_api/get_all_themes" | "/_api/get_calendar" | "/_api/get_docs" | "/_api/get_translation" | "/_api/list_languages" | "/_api/load_theme" | "/_api/log_backend" | "/_api/popups" | "/_api/save_config" | "/_api/save_dashboard" | "/_api/version" | "/_api/waste_collection" | "/_api/waste_collection/ai_extract" | "/_api/waste_collection/image" | "/_api/waste_collection/upload" | "/_api/youtube";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/apple-touch-icon.png" | "/documentation/Developer.md" | "/documentation/Documentation.md" | "/documentation/Map.md" | "/favicon.ico" | "/favicon.png" | "/icon-192.png" | "/loader.svg" | "/manifest.json" | "/preview.png" | "/robots.txt" | "/themes/contrast.yaml" | "/themes/contrast_thumbnail.webp" | "/themes/godis.yaml" | "/themes/godis_background.webp" | "/themes/godis_thumbnail.webp" | "/themes/muted.yaml" | "/themes/muted_background.webp" | "/themes/muted_thumbnail.webp" | "/themes/playground/category.yaml" | "/themes/serene.yaml" | "/themes/serene_background.webp" | "/translations/af.json" | "/translations/ar.json" | "/translations/bg.json" | "/translations/bn.json" | "/translations/bs.json" | "/translations/ca.json" | "/translations/cs.json" | "/translations/cy.json" | "/translations/da.json" | "/translations/de.json" | "/translations/el.json" | "/translations/en-GB.json" | "/translations/en.json" | "/translations/eo.json" | "/translations/es-419.json" | "/translations/es.json" | "/translations/et.json" | "/translations/eu.json" | "/translations/fa.json" | "/translations/fi.json" | "/translations/fr.json" | "/translations/fy.json" | "/translations/ga.json" | "/translations/gl.json" | "/translations/gsw.json" | "/translations/he.json" | "/translations/hi.json" | "/translations/hr.json" | "/translations/hu.json" | "/translations/hy.json" | "/translations/id.json" | "/translations/is.json" | "/translations/it.json" | "/translations/ja.json" | "/translations/ka.json" | "/translations/ko.json" | "/translations/lb.json" | "/translations/lt.json" | "/translations/lv.json" | "/translations/mk.json" | "/translations/ml.json" | "/translations/nb.json" | "/translations/nl.json" | "/translations/nn.json" | "/translations/no.json" | "/translations/pl.json" | "/translations/pt-BR.json" | "/translations/pt.json" | "/translations/ro.json" | "/translations/ru.json" | "/translations/sk.json" | "/translations/sl.json" | "/translations/sr-Latn.json" | "/translations/sr.json" | "/translations/sv.json" | "/translations/ta.json" | "/translations/te.json" | "/translations/th.json" | "/translations/tr.json" | "/translations/uk.json" | "/translations/ur.json" | "/translations/vi.json" | "/translations/zh-Hans.json" | "/translations/zh-Hant.json" | "/translations/zh.json" | "/weather/meteocons/README.md" | "/weather/meteocons/clear-night-day.svg" | "/weather/meteocons/clear-night-night.svg" | "/weather/meteocons/cloudy-day.svg" | "/weather/meteocons/cloudy-night.svg" | "/weather/meteocons/exceptional-day.svg" | "/weather/meteocons/exceptional-night.svg" | "/weather/meteocons/fog-day.svg" | "/weather/meteocons/fog-night.svg" | "/weather/meteocons/hail-day.svg" | "/weather/meteocons/hail-night.svg" | "/weather/meteocons/lightning-day.svg" | "/weather/meteocons/lightning-night.svg" | "/weather/meteocons/lightning-rainy-day.svg" | "/weather/meteocons/lightning-rainy-night.svg" | "/weather/meteocons/partlycloudy-day.svg" | "/weather/meteocons/partlycloudy-night.svg" | "/weather/meteocons/pouring-day.svg" | "/weather/meteocons/pouring-night.svg" | "/weather/meteocons/rainy-day.svg" | "/weather/meteocons/rainy-night.svg" | "/weather/meteocons/snowy-day.svg" | "/weather/meteocons/snowy-night.svg" | "/weather/meteocons/snowy-rainy-day.svg" | "/weather/meteocons/snowy-rainy-night.svg" | "/weather/meteocons/sunny-day.svg" | "/weather/meteocons/sunny-night.svg" | "/weather/meteocons/windy-day.svg" | "/weather/meteocons/windy-night.svg" | "/weather/meteocons/windy-variant-day.svg" | "/weather/meteocons/windy-variant-night.svg" | string & {};
	}
}