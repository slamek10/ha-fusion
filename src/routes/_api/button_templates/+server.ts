import { readdir, readFile } from 'fs/promises';
import { json, error } from '@sveltejs/kit';
import * as yaml from 'js-yaml';
import path from 'path';
import type { RequestHandler } from './$types';

interface TemplateItem {
	file: string;
	name: string;
	keys: string[];
}

const DEFAULT_TEMPLATE_DIRS = [
	'/Volumes/config/button_card_templates',
	'/config/button_card_templates',
	'./data/button_card_templates',
	'/Users/islamek/ha-habitat/configs/button_card_templates'
];

async function getConfiguredDir(): Promise<string | null> {
	try {
		const raw = await readFile('./data/configuration.yaml', 'utf8');
		const config: any = yaml.load(raw);
		if (config?.template_dir && typeof config.template_dir === 'string') {
			return config.template_dir.trim();
		}
	} catch {
		// Ignore
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

	candidates.push(...DEFAULT_TEMPLATE_DIRS);

	for (const candidate of candidates) {
		try {
			await readdir(candidate);
			return candidate;
		} catch {
			// Continue
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
				return error(404, `No template directory available to find: ${targetFile}`);
			}
			return json({ dir: customDir || './data/button_card_templates', templates: [] });
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
				return error(404, `Template file not found at ${fullPath}: ${readErr?.message}`);
			}
		}

		const files = await readdir(dir);
		const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

		const definitions: Record<string, any> = {};

		const templates: TemplateItem[] = await Promise.all(
			yamlFiles.map(async (file) => {
				const name = path.parse(file).name;
				let keys: string[] = [];

				try {
					const content = await readFile(path.join(dir, file), 'utf8');
					const parsed: any = yaml.load(content);
					if (parsed && typeof parsed === 'object') {
						keys = Object.keys(parsed);
						for (const [k, v] of Object.entries(parsed)) {
							if (v && typeof v === 'object') {
								definitions[k] = { ...(v as any), _file: file, _key: k };
							}
						}
					}
				} catch {
					// Fallback
				}

				return {
					file,
					name,
					keys
				};
			})
		);

		return json({
			dir,
			templates,
			definitions
		});
	} catch (err: any) {
		return error(500, err?.message || 'Failed to list templates');
	}
};
