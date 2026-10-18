import { x as error } from '../../../../../chunks/utils.js-DLsluu6x.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import '../../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/waste_collection/image/+server.ts
var CANDIDATE_FILES = [
	"./data/waste_collection_calendar.png",
	"./data/waste_collection_calendar.jpg",
	"./data/waste_collection_calendar.jpeg",
	"./data/waste_collection_calendar.webp"
];
var GET = async ({ setHeaders }) => {
	let foundFile = null;
	for (const candidate of CANDIDATE_FILES) if (existsSync(candidate)) {
		foundFile = candidate;
		break;
	}
	if (!foundFile) return error(404, "No calendar image uploaded yet");
	try {
		const buffer = await readFile(foundFile);
		const ext = path.extname(foundFile).toLowerCase();
		setHeaders({
			"Content-Type": ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png",
			"Cache-Control": "public, max-age=60"
		});
		return new Response(buffer);
	} catch (err) {
		return error(500, err?.message || "Failed to read calendar image");
	}
};

export { GET };
//# sourceMappingURL=_server.ts.js-mmS3GCWM.js.map
