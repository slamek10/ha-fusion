import { error } from "@sveltejs/kit";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
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
//#endregion
export { GET };
