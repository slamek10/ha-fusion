import { x as error, j as json } from '../../../../chunks/utils.js-DLsluu6x.js';
import { writeFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import '../../../../chunks/shared.js-D28eHxhC.js';

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

export { POST };
//# sourceMappingURL=_server.ts.js-B18H3qlH.js.map
