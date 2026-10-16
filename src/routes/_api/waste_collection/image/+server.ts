import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';
import { existsSync } from 'fs';

const CANDIDATE_FILES = [
	'./data/waste_collection_calendar.png',
	'./data/waste_collection_calendar.jpg',
	'./data/waste_collection_calendar.jpeg',
	'./data/waste_collection_calendar.webp'
];

export const GET: RequestHandler = async ({ setHeaders }) => {
	let foundFile: string | null = null;
	for (const candidate of CANDIDATE_FILES) {
		if (existsSync(candidate)) {
			foundFile = candidate;
			break;
		}
	}

	if (!foundFile) {
		return error(404, 'No calendar image uploaded yet');
	}

	try {
		const buffer = await readFile(foundFile);
		const ext = path.extname(foundFile).toLowerCase();
		const contentType =
			ext === '.jpg' || ext === '.jpeg'
				? 'image/jpeg'
				: ext === '.webp'
					? 'image/webp'
					: 'image/png';

		setHeaders({
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=60'
		});

		return new Response(buffer);
	} catch (err: any) {
		return error(500, err?.message || 'Failed to read calendar image');
	}
};
