import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';
import { existsSync } from 'fs';

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const filename = url.searchParams.get('name');
	if (!filename) {
		return error(400, 'Missing name parameter');
	}

	// Prevent directory traversal
	const safeName = path.basename(filename);
	const targetPath = path.join('./data/custom_cards', safeName);

	if (!existsSync(targetPath)) {
		return error(404, `Card file not found: ${safeName}`);
	}

	try {
		const content = await readFile(targetPath);
		setHeaders({
			'Content-Type': 'application/javascript; charset=utf-8',
			'Cache-Control': 'no-cache, must-revalidate'
		});
		return new Response(content);
	} catch (err: any) {
		return error(500, err?.message || 'Failed to serve card file');
	}
};
