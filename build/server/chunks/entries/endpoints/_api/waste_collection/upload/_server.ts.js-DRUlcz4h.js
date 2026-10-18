import { x as error, j as json } from '../../../../../chunks/utils.js-DLsluu6x.js';
import { unlink, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import '../../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/waste_collection/upload/+server.ts
var POST = async ({ request }) => {
	try {
		const contentType = request.headers.get("content-type") || "";
		let imageBuffer = null;
		let ext = "png";
		if (contentType.includes("multipart/form-data")) {
			const file = (await request.formData()).get("file");
			if (!file || !(file instanceof File)) return error(400, "No file provided in form data");
			const arrayBuffer = await file.arrayBuffer();
			imageBuffer = Buffer.from(arrayBuffer);
			const parsedExt = path.extname(file.name).toLowerCase().replace(".", "");
			if ([
				"png",
				"jpg",
				"jpeg",
				"webp"
			].includes(parsedExt)) ext = parsedExt;
		} else if (contentType.includes("application/json")) {
			const body = await request.json();
			if (!body?.image) return error(400, "Missing \"image\" in JSON payload");
			if (body.name) {
				const parsedExt = path.extname(body.name).toLowerCase().replace(".", "");
				if ([
					"png",
					"jpg",
					"jpeg",
					"webp"
				].includes(parsedExt)) ext = parsedExt;
			}
			const match = body.image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
			if (match) {
				const mimeExt = match[1].toLowerCase();
				ext = mimeExt === "jpeg" ? "jpg" : mimeExt;
				imageBuffer = Buffer.from(match[2], "base64");
			} else imageBuffer = Buffer.from(body.image, "base64");
		} else return error(400, "Unsupported Content-Type");
		if (!imageBuffer || imageBuffer.length === 0) return error(400, "Uploaded image is empty");
		const targetExt = ext === "jpeg" ? "jpg" : ext;
		for (const candidate of [
			"./data/waste_collection_calendar.png",
			"./data/waste_collection_calendar.jpg",
			"./data/waste_collection_calendar.jpeg",
			"./data/waste_collection_calendar.webp"
		]) try {
			if (existsSync(candidate)) await unlink(candidate);
		} catch {}
		await writeFile(`./data/waste_collection_calendar.${targetExt}`, imageBuffer);
		try {
			const raw = await readFile("./data/waste_collection.json", "utf8");
			const parsed = JSON.parse(raw);
			parsed.has_calendar_image = true;
			parsed.calendar_image = `/_api/waste_collection/image?t=${Date.now()}`;
			parsed.last_updated = (/* @__PURE__ */ new Date()).toISOString();
			await writeFile("./data/waste_collection.json", JSON.stringify(parsed, null, 2), "utf8");
		} catch {}
		return json({
			ok: true,
			imageUrl: `/_api/waste_collection/image?t=${Date.now()}`,
			size: imageBuffer.length
		});
	} catch (err) {
		return error(500, err?.message || "Failed to upload calendar image");
	}
};

export { POST };
//# sourceMappingURL=_server.ts.js-DRUlcz4h.js.map
