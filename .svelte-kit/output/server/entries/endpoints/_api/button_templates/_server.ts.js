import { error, json } from "@sveltejs/kit";
import { readFile, readdir } from "fs/promises";
import * as yaml from "js-yaml";
import path from "path";
//#region src/routes/_api/button_templates/+server.ts
var DEFAULT_TEMPLATE_DIRS = [
	"/Volumes/config/button_card_templates",
	"/config/button_card_templates",
	"./data/button_card_templates",
	"/Users/islamek/ha-habitat/configs/button_card_templates"
];
async function getConfiguredDir() {
	try {
		const raw = await readFile("./data/configuration.yaml", "utf8");
		const config = yaml.load(raw);
		if (config?.template_dir && typeof config.template_dir === "string") return config.template_dir.trim();
	} catch {}
	return null;
}
async function resolveDirectory(customDir) {
	const candidates = [];
	if (customDir && customDir.trim()) candidates.push(customDir.trim());
	const configDir = await getConfiguredDir();
	if (configDir) candidates.push(configDir);
	candidates.push(...DEFAULT_TEMPLATE_DIRS);
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
			if (targetFile) return error(404, `No template directory available to find: ${targetFile}`);
			return json({
				dir: customDir || "./data/button_card_templates",
				templates: []
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
				return error(404, `Template file not found at ${fullPath}: ${readErr?.message}`);
			}
		}
		const yamlFiles = (await readdir(dir)).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
		const definitions = {};
		return json({
			dir,
			templates: await Promise.all(yamlFiles.map(async (file) => {
				const name = path.parse(file).name;
				let keys = [];
				try {
					const content = await readFile(path.join(dir, file), "utf8");
					const parsed = yaml.load(content);
					if (parsed && typeof parsed === "object") {
						keys = Object.keys(parsed);
						for (const [k, v] of Object.entries(parsed)) if (v && typeof v === "object") definitions[k] = {
							...v,
							_file: file,
							_key: k
						};
					}
				} catch {}
				return {
					file,
					name,
					keys
				};
			})),
			definitions
		});
	} catch (err) {
		return error(500, err?.message || "Failed to list templates");
	}
};
//#endregion
export { GET };
