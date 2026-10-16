import { j as json, x as error } from '../../../../chunks/utils.js-DLsluu6x.js';
import { readdir } from 'fs/promises';
import path from 'path';
import '../../../../chunks/shared.js-D28eHxhC.js';

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

export { GET };
//# sourceMappingURL=_server.ts.js-BkoWWkb9.js.map
