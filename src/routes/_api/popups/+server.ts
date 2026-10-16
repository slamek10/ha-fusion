import { readdir, readFile } from 'fs/promises';
import { json, error } from '@sveltejs/kit';
import * as yaml from 'js-yaml';
import path from 'path';
import type { RequestHandler } from './$types';

interface PopupItem {
	file: string;
	name: string;
	title: string;
}

const DEFAULT_POPUP_DIRS = [
	'/Volumes/config/popup',
	'/config/popup',
	'./data/popup',
	'./data/popups',
	'/Users/islamek/ha-habitat/configs/popups'
];

async function getConfiguredDir(): Promise<string | null> {
	try {
		const raw = await readFile('./data/configuration.yaml', 'utf8');
		const config: any = yaml.load(raw);
		if (config?.popup_dir && typeof config.popup_dir === 'string') {
			return config.popup_dir.trim();
		}
	} catch {
		// Ignore if configuration.yaml doesn't exist yet
	}
	return null;
}

async function resolveDirectory(customDir?: string | null): Promise<string | null> {
	const candidates: string[] = [];

	if (customDir && customDir.trim()) {
		candidates.push(customDir.trim());
	}

	const configDir = await getConfiguredDir();
	if (configDir) {
		candidates.push(configDir);
	}

	candidates.push(...DEFAULT_POPUP_DIRS);

	for (const candidate of candidates) {
		try {
			await readdir(candidate);
			return candidate;
		} catch {
			// Continue to next candidate
		}
	}

	return null;
}

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	try {
		const targetFile = url.searchParams.get('file');
		const customDir = url.searchParams.get('dir');
		const dir = await resolveDirectory(customDir);

		setHeaders({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			Pragma: 'no-cache',
			Expires: '0'
		});

		if (!dir) {
			if (targetFile) {
				return error(404, `No popup directory available to find: ${targetFile}`);
			}
			return json({ dir: customDir || './data/popup', popups: [] });
		}

		if (targetFile) {
			const sanitized = path.basename(targetFile);
			const fullPath = path.join(dir, sanitized);

			try {
				const content = await readFile(fullPath, 'utf8');
				const parsed = yaml.load(content);
				return json({
					dir,
					file: sanitized,
					data: parsed
				});
			} catch (readErr: any) {
				return error(404, `Popup file not found at ${fullPath}: ${readErr?.message}`);
			}
		}

		// List all available popups
		const files = await readdir(dir);
		const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

		const popups: PopupItem[] = await Promise.all(
			yamlFiles.map(async (file) => {
				const name = path.parse(file).name;
				let title = name.replace(/_/g, ' ');

				try {
					const content = await readFile(path.join(dir, file), 'utf8');
					const parsed: any = yaml.load(content);
					if (parsed?.data?.title) {
						title = parsed.data.title;
					} else if (parsed?.title) {
						title = parsed.title;
					}
				} catch {
					// Fallback to formatted filename
				}

				return {
					file,
					name,
					title
				};
			})
		);

		return json({
			dir,
			popups
		});
	} catch (err: any) {
		return error(500, err?.message || 'Failed to process popup request');
	}
};
