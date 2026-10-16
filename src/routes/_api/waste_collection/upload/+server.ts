import { writeFile, readFile, unlink } from 'fs/promises';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';
import { existsSync } from 'fs';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type') || '';
		let imageBuffer: Buffer | null = null;
		let ext = 'png';

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			const file = formData.get('file');
			if (!file || !(file instanceof File)) {
				return error(400, 'No file provided in form data');
			}
			const arrayBuffer = await file.arrayBuffer();
			imageBuffer = Buffer.from(arrayBuffer);
			const parsedExt = path.extname(file.name).toLowerCase().replace('.', '');
			if (['png', 'jpg', 'jpeg', 'webp'].includes(parsedExt)) {
				ext = parsedExt;
			}
		} else if (contentType.includes('application/json')) {
			const body = await request.json();
			if (!body?.image) {
				return error(400, 'Missing "image" in JSON payload');
			}
			if (body.name) {
				const parsedExt = path.extname(body.name).toLowerCase().replace('.', '');
				if (['png', 'jpg', 'jpeg', 'webp'].includes(parsedExt)) {
					ext = parsedExt;
				}
			}
			const match = body.image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
			if (match) {
				const mimeExt = match[1].toLowerCase();
				ext = mimeExt === 'jpeg' ? 'jpg' : mimeExt;
				imageBuffer = Buffer.from(match[2], 'base64');
			} else {
				imageBuffer = Buffer.from(body.image, 'base64');
			}
		} else {
			return error(400, 'Unsupported Content-Type');
		}

		if (!imageBuffer || imageBuffer.length === 0) {
			return error(400, 'Uploaded image is empty');
		}

		const targetExt = ext === 'jpeg' ? 'jpg' : ext;

		// Clean up existing calendar files with other extensions so image endpoint serves the newest
		const candidateFiles = [
			'./data/waste_collection_calendar.png',
			'./data/waste_collection_calendar.jpg',
			'./data/waste_collection_calendar.jpeg',
			'./data/waste_collection_calendar.webp'
		];
		for (const candidate of candidateFiles) {
			try {
				if (existsSync(candidate)) {
					await unlink(candidate);
				}
			} catch {
				// Ignore deletion errors
			}
		}

		const filePath = `./data/waste_collection_calendar.${targetExt}`;
		await writeFile(filePath, imageBuffer);

		// Also update waste_collection.json metadata if exists
		try {
			const raw = await readFile('./data/waste_collection.json', 'utf8');
			const parsed = JSON.parse(raw);
			parsed.has_calendar_image = true;
			parsed.calendar_image = `/_api/waste_collection/image?t=${Date.now()}`;
			parsed.last_updated = new Date().toISOString();
			await writeFile('./data/waste_collection.json', JSON.stringify(parsed, null, 2), 'utf8');
		} catch {
			// Ignore if not present yet
		}

		return json({
			ok: true,
			imageUrl: `/_api/waste_collection/image?t=${Date.now()}`,
			size: imageBuffer.length
		});
	} catch (err: any) {
		return error(500, err?.message || 'Failed to upload calendar image');
	}
};
