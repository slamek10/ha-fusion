import { error, json } from "@sveltejs/kit";
import { readFile } from "fs/promises";
import * as yaml from "js-yaml";
//#region src/routes/_api/load_theme/+server.ts
var POST = async ({ request }) => {
	try {
		const file = await readFile(`build/client/themes/${(await request.json())?.theme}.yaml`, "utf8");
		return json(yaml.load(file));
	} catch (err) {
		error(500, err.message);
	}
};
//#endregion
export { POST };
