import { x as error, j as json } from '../../../../chunks/utils.js-DLsluu6x.js';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';
import '../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/popups/+server.ts
var DEFAULT_POPUP_DIRS = [
	"/Volumes/config/popup",
	"/config/popup",
	"./data/popup",
	"./data/popups",
	"/Users/islamek/ha-habitat/configs/popups"
];
async function getConfiguredDir() {
	try {
		const raw = await readFile("./data/configuration.yaml", "utf8");
		const config = yaml.load(raw);
		if (config?.popup_dir && typeof config.popup_dir === "string") return config.popup_dir.trim();
	} catch {}
	return null;
}
async function resolveDirectory(customDir) {
	const candidates = [];
	if (customDir && customDir.trim()) candidates.push(customDir.trim());
	const configDir = await getConfiguredDir();
	if (configDir) candidates.push(configDir);
	candidates.push(...DEFAULT_POPUP_DIRS);
	for (const candidate of candidates) try {
		await readdir(candidate);
		return candidate;
	} catch {}
	return null;
}
var GET = async ({ url, setHeaders }) => {
	try {
		const targetFile = url.searchParams.get("file");
		const customDir = url.searchParams.get("dir");
		const dir = await resolveDirectory(customDir);
		setHeaders({
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Pragma: "no-cache",
			Expires: "0"
		});
		if (!dir) {
			if (targetFile) return error(404, `No popup directory available to find: ${targetFile}`);
			return json({
				dir: customDir || "./data/popup",
				popups: []
			});
		}
		if (targetFile) {
			const sanitized = path.basename(targetFile);
			const fullPath = path.join(dir, sanitized);
			try {
				const content = await readFile(fullPath, "utf8");
				return json({
					dir,
					file: sanitized,
					data: yaml.load(content)
				});
			} catch (readErr) {
				return error(404, `Popup file not found at ${fullPath}: ${readErr?.message}`);
			}
		}
		const yamlFiles = (await readdir(dir)).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
		return json({
			dir,
			popups: await Promise.all(yamlFiles.map(async (file) => {
				const name = path.parse(file).name;
				let title = name.replace(/_/g, " ");
				try {
					const content = await readFile(path.join(dir, file), "utf8");
					const parsed = yaml.load(content);
					if (parsed?.data?.title) title = parsed.data.title;
					else if (parsed?.title) title = parsed.title;
				} catch {}
				return {
					file,
					name,
					title
				};
			}))
		});
	} catch (err) {
		return error(500, err?.message || "Failed to process popup request");
	}
};

export { GET };
//# sourceMappingURL=_server.ts.js-CzDeoKlU.js.map
