import { readFile } from "fs/promises";
import * as yaml from "js-yaml";
import dotenv from "dotenv";
//#region src/routes/+page.server.ts
dotenv.config();
/**
* Loads a yaml/json file and returns parsed data
*/
async function loadFile(file) {
	try {
		const data = await readFile(file, "utf8");
		if (!data.trim()) return {};
		else return file.endsWith(".yaml") ? yaml.load(data) : JSON.parse(data);
	} catch (error) {
		if (error?.code === "ENOENT") {} else console.error(`Error reading or parsing ${file}:`, error);
		return {};
	}
}
/**
* Server load function
*/
async function load({ request }) {
	const [configuration, dashboard] = await Promise.all([loadFile("./data/configuration.yaml"), loadFile("./data/dashboard.yaml")]);
	configuration.hassUrl = process.env.HASS_URL || request.headers.get("X-Proxy-Target");
	dashboard.views = dashboard.views || [];
	dashboard.sidebar = dashboard.sidebar || [];
	const dir = "./build/client";
	const [theme, en, locale] = await Promise.all([
		loadFile(`${dir}/themes/${dashboard.theme || "godis"}.yaml`),
		loadFile(`${dir}/translations/en.json`),
		configuration?.locale && configuration.locale !== "en" ? loadFile(`${dir}/translations/${configuration.locale}.json`) : void 0
	]);
	return {
		configuration,
		dashboard,
		theme,
		translations: locale ? {
			...locale,
			_default: en
		} : en
	};
}
//#endregion
export { load };
