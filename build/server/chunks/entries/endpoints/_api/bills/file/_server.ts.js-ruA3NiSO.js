import { x as error } from '../../../../../chunks/utils.js-DLsluu6x.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import '../../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/bills/file/+server.ts
var FILES_DIR = "./data/bills_files";
var GET = async ({ url, setHeaders }) => {
	const fileName = url.searchParams.get("name");
	if (!fileName) return error(400, "Missing \"name\" query parameter");
	const safeName = path.basename(fileName);
	const filePath = path.join(FILES_DIR, safeName);
	if (!existsSync(filePath)) return error(404, "Bill file not found");
	try {
		const buffer = await readFile(filePath);
		const ext = path.extname(safeName).toLowerCase();
		let contentType = "application/octet-stream";
		if (ext === ".pdf") contentType = "application/pdf";
		else if (ext === ".png") contentType = "image/png";
		else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
		else if (ext === ".webp") contentType = "image/webp";
		setHeaders({
			"Content-Type": contentType,
			"Content-Disposition": `inline; filename="${safeName}"`,
			"Cache-Control": "public, max-age=86400"
		});
		return new Response(buffer);
	} catch (err) {
		return error(500, err?.message || "Failed to read bill file");
	}
};

export { GET };
//# sourceMappingURL=_server.ts.js-ruA3NiSO.js.map
