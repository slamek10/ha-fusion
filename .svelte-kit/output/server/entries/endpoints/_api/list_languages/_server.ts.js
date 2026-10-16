import { error, json } from "@sveltejs/kit";
import { readdir } from "fs/promises";
import path from "path";
//#region src/routes/_api/list_languages/+server.ts
var GET = async ({ setHeaders }) => {
	try {
		const languages = (await readdir("./build/client/translations")).filter((file) => path.extname(file) === ".json").map((file) => file.split(".")[0]);
		setHeaders({ "Cache-Control": "max-age=0" });
		return json(languages);
	} catch (err) {
		error(500, err.message);
	}
};
//#endregion
export { GET };
