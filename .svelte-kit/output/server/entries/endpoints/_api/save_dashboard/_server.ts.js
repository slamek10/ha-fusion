import { error, json } from "@sveltejs/kit";
import { writeFile } from "fs/promises";
import * as yaml from "js-yaml";
//#region src/routes/_api/save_dashboard/+server.ts
var POST = async ({ request }) => {
	const body = await request.json();
	let data;
	try {
		data = yaml.dump(body);
	} catch (err) {
		error(500, err.message);
	}
	try {
		await writeFile("./data/dashboard.yaml", data);
		return json({ message: "saved" });
	} catch (err) {
		error(500, err.message);
	}
};
//#endregion
export { POST };
