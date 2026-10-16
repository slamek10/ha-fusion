import { error, json } from "@sveltejs/kit";
import { readFile } from "fs/promises";
//#region src/routes/_api/get_translation/+server.ts
var POST = async ({ request, setHeaders }) => {
	try {
		const body = await request.json();
		if (!body.locale || typeof body.locale !== "string") throw new Error("Invalid locale");
		const dir = "./build/client/translations";
		const [en, locale] = await Promise.all([readFile(`${dir}/en.json`, "utf8"), body.locale && body.locale !== "en" ? readFile(`${dir}/${body.locale}.json`, "utf8") : void 0]);
		const translations = locale ? {
			...JSON.parse(locale),
			_default: JSON.parse(en)
		} : JSON.parse(en);
		setHeaders({ "Cache-Control": "max-age=0" });
		return json(translations);
	} catch (err) {
		error(500, err.message);
	}
};
//#endregion
export { POST };
