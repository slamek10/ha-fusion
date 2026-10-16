import { j as json } from '../../../../chunks/utils.js-DLsluu6x.js';
import { writeFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import '../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/save_config/+server.ts
var POST = async ({ request }) => {
	const body = await request.json();
	let data;
	try {
		data = yaml.dump(body);
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON - cannot convert to YAML" }), { status: 400 });
	}
	try {
		await writeFile("data/configuration.yaml", data);
		return json({ action: "saved" });
	} catch (error) {
		return new Response(JSON.stringify({ error }), { status: 400 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts.js-DfphZlQ7.js.map
