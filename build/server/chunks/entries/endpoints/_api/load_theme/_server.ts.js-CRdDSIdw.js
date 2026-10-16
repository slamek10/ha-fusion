import { j as json, x as error } from '../../../../chunks/utils.js-DLsluu6x.js';
import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import '../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/load_theme/+server.ts
var POST = async ({ request }) => {
	try {
		const file = await readFile(`build/client/themes/${(await request.json())?.theme}.yaml`, "utf8");
		return json(yaml.load(file));
	} catch (err) {
		error(500, err.message);
	}
};

export { POST };
//# sourceMappingURL=_server.ts.js-CRdDSIdw.js.map
