import { x as error } from '../../../../../chunks/utils.js-DLsluu6x.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import '../../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/custom_cards/file/+server.ts
var GET = async ({ url, setHeaders }) => {
	const filename = url.searchParams.get("name");
	if (!filename) return error(400, "Missing name parameter");
	const safeName = path.basename(filename);
	const targetPath = path.join("./data/custom_cards", safeName);
	if (!existsSync(targetPath)) return error(404, `Card file not found: ${safeName}`);
	try {
		const content = await readFile(targetPath);
		setHeaders({
			"Content-Type": "application/javascript; charset=utf-8",
			"Cache-Control": "no-cache, must-revalidate"
		});
		return new Response(content);
	} catch (err) {
		return error(500, err?.message || "Failed to serve card file");
	}
};

export { GET };
//# sourceMappingURL=_server.ts.js-XVsvRcoZ.js.map
