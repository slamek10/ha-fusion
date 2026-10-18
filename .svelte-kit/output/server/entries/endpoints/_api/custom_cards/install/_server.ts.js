import { error, json } from "@sveltejs/kit";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
//#region src/routes/_api/custom_cards/install/+server.ts
var METADATA_FILE = "./data/custom_cards.json";
var CARDS_DIR = "./data/custom_cards";
var MUSHROOM_SUB_CARDS = [
	{
		tag: "mushroom-light-card",
		name: "Mushroom Light Card",
		default_config: {
			type: "custom:mushroom-light-card",
			entity: "light.living_room",
			show_brightness_control: true,
			show_color_temp_control: true
		}
	},
	{
		tag: "mushroom-entity-card",
		name: "Mushroom Entity Card",
		default_config: {
			type: "custom:mushroom-entity-card",
			entity: "sensor.sun_next_rising"
		}
	},
	{
		tag: "mushroom-template-card",
		name: "Mushroom Template Card",
		default_config: {
			type: "custom:mushroom-template-card",
			primary: "Dobar dan",
			secondary: "Sve radi ispravno",
			icon: "mdi:home"
		}
	},
	{
		tag: "mushroom-chips-card",
		name: "Mushroom Chips Card",
		default_config: {
			type: "custom:mushroom-chips-card",
			chips: [{
				type: "weather",
				entity: "weather.forecast_home"
			}]
		}
	},
	{
		tag: "mushroom-cover-card",
		name: "Mushroom Cover Card",
		default_config: {
			type: "custom:mushroom-cover-card",
			entity: "cover.living_room",
			show_position_control: true
		}
	},
	{
		tag: "mushroom-fan-card",
		name: "Mushroom Fan Card",
		default_config: {
			type: "custom:mushroom-fan-card",
			entity: "fan.living_room",
			show_percentage_control: true
		}
	},
	{
		tag: "mushroom-climate-card",
		name: "Mushroom Climate Card",
		default_config: {
			type: "custom:mushroom-climate-card",
			entity: "climate.thermostat",
			show_temperature_control: true
		}
	},
	{
		tag: "mushroom-person-card",
		name: "Mushroom Person Card",
		default_config: {
			type: "custom:mushroom-person-card",
			entity: "person.admin"
		}
	},
	{
		tag: "mushroom-alarm-control-panel-card",
		name: "Mushroom Alarm Card",
		default_config: {
			type: "custom:mushroom-alarm-control-panel-card",
			entity: "alarm_control_panel.home"
		}
	},
	{
		tag: "mushroom-lock-card",
		name: "Mushroom Lock Card",
		default_config: {
			type: "custom:mushroom-lock-card",
			entity: "lock.front_door"
		}
	},
	{
		tag: "mushroom-media-player-card",
		name: "Mushroom Media Player Card",
		default_config: {
			type: "custom:mushroom-media-player-card",
			entity: "media_player.spotify",
			show_volume_level: true
		}
	},
	{
		tag: "mushroom-vacuum-card",
		name: "Mushroom Vacuum Card",
		default_config: {
			type: "custom:mushroom-vacuum-card",
			entity: "vacuum.roborock"
		}
	},
	{
		tag: "mushroom-title-card",
		name: "Mushroom Title Card",
		default_config: {
			type: "custom:mushroom-title-card",
			title: "Dnevni boravak",
			subtitle: "Pregled"
		}
	},
	{
		tag: "mushroom-update-card",
		name: "Mushroom Update Card",
		default_config: {
			type: "custom:mushroom-update-card",
			entity: "update.ha_fusion"
		}
	},
	{
		tag: "mushroom-number-card",
		name: "Mushroom Number Card",
		default_config: {
			type: "custom:mushroom-number-card",
			entity: "number.example"
		}
	},
	{
		tag: "mushroom-select-card",
		name: "Mushroom Select Card",
		default_config: {
			type: "custom:mushroom-select-card",
			entity: "select.example"
		}
	},
	{
		tag: "mushroom-humidifier-card",
		name: "Mushroom Humidifier Card",
		default_config: {
			type: "custom:mushroom-humidifier-card",
			entity: "humidifier.example"
		}
	}
];
var BUBBLE_SUB_CARDS = [
	{
		id: "bubble-button",
		tag: "bubble-card",
		name: "Bubble Button Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "button",
			entity: "light.living_room"
		}
	},
	{
		id: "bubble-cover",
		tag: "bubble-card",
		name: "Bubble Cover Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "cover",
			entity: "cover.living_room"
		}
	},
	{
		id: "bubble-climate",
		tag: "bubble-card",
		name: "Bubble Climate Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "climate",
			entity: "climate.thermostat"
		}
	},
	{
		id: "bubble-media-player",
		tag: "bubble-card",
		name: "Bubble Media Player Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "media-player",
			entity: "media_player.spotify"
		}
	},
	{
		id: "bubble-pop-up",
		tag: "bubble-card",
		name: "Bubble Pop-up Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "pop-up",
			hash: "#popup"
		}
	},
	{
		id: "bubble-separator",
		tag: "bubble-card",
		name: "Bubble Separator Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "separator",
			name: "Naslov",
			icon: "mdi:home"
		}
	},
	{
		id: "bubble-select",
		tag: "bubble-card",
		name: "Bubble Select Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "select",
			entity: "input_select.mode"
		}
	},
	{
		id: "bubble-calendar",
		tag: "bubble-card",
		name: "Bubble Calendar Card",
		default_config: {
			type: "custom:bubble-card",
			card_type: "calendar",
			entity: "calendar.personal"
		}
	}
];
function detectCardDetails(jsContent, saveName, repoName, customTag) {
	if (repoName.toLowerCase().includes("mushroom") || saveName.toLowerCase().includes("mushroom")) return {
		cardId: "mushroom",
		cardName: "Mushroom Cards (Lovelace Mushroom)",
		detectedTag: "mushroom-light-card",
		description: "Zbirka od 17 modernih Lovelace kartica (Light, Entity, Chips, Template, Cover, Fan, itd.).",
		defaultConfig: {
			type: "custom:mushroom-light-card",
			entity: "light.living_room",
			show_brightness_control: true,
			show_color_temp_control: true
		},
		subCards: MUSHROOM_SUB_CARDS
	};
	if (repoName.toLowerCase().includes("bubble") || saveName.toLowerCase().includes("bubble")) return {
		cardId: "bubble-card",
		cardName: "Bubble Card",
		detectedTag: "bubble-card",
		description: "Modularna kolekcija modernih kartica (Button, Cover, Climate, Pop-up, Media Player itd.) za Home Assistant.",
		defaultConfig: {
			type: "custom:bubble-card",
			card_type: "button",
			entity: "light.living_room"
		},
		subCards: BUBBLE_SUB_CARDS
	};
	const customCardsMatch = jsContent.match(/customCards\.push\s*\(\s*\{([^}]+)\}/i);
	let ccTag = "";
	let ccName = "";
	let ccDesc = "";
	if (customCardsMatch) {
		const block = customCardsMatch[1];
		const typeMatch = block.match(/type\s*:\s*['"]([^'"]+)['"]/i);
		const nameMatch = block.match(/name\s*:\s*['"]([^'"]+)['"]/i);
		const descMatch = block.match(/description\s*:\s*['"]([^'"]+)['"]/i);
		if (typeMatch) ccTag = typeMatch[1].replace(/^custom:/, "");
		if (nameMatch) ccName = nameMatch[1];
		if (descMatch) ccDesc = descMatch[1];
	}
	const cardMatches = [...jsContent.matchAll(/['"]([a-z0-9-]+-card)['"]/gi)].map((m) => m[1]);
	const uniqueCards = [...new Set(cardMatches)].filter((t) => !t.startsWith("hui-") && !t.includes("editor"));
	const tagMatch = jsContent.match(/customElements\.define\s*\(\s*['"]([a-z0-9-]+-card)['"]/i) || jsContent.match(/customElements\.define\s*\(\s*['"]([a-z0-9-]+)['"]/i);
	const detectedTag = customTag || ccTag || uniqueCards[0] || (tagMatch ? tagMatch[1] : saveName.replace(/\.js$/, ""));
	const cardId = detectedTag.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
	const subCards = uniqueCards.length > 1 ? uniqueCards.map((t) => ({
		tag: t,
		name: t.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
		default_config: { type: `custom:${t}` }
	})) : void 0;
	return {
		cardId,
		cardName: ccName || detectedTag.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
		detectedTag,
		description: ccDesc || "",
		defaultConfig: { type: `custom:${detectedTag}` },
		subCards
	};
}
var POST = async ({ request }) => {
	try {
		const { url, name, tag } = await request.json();
		if (!url || typeof url !== "string") return error(400, "URL is required");
		let downloadUrl = url.trim();
		let detectedFileName = "";
		let repoName = "";
		let author = "";
		const ghMatch = downloadUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git|\/)?$/i);
		if (ghMatch) {
			author = ghMatch[1];
			repoName = ghMatch[2].replace(/\.git$/, "");
			const branches = ["main", "master"];
			let jsContent = "";
			let foundUrl = "";
			for (const branch of branches) {
				try {
					const hacsRes = await fetch(`https://raw.githubusercontent.com/${author}/${repoName}/${branch}/hacs.json`);
					if (hacsRes.ok) {
						const hacsJson = await hacsRes.json();
						const filename = hacsJson.filename || `${repoName.toLowerCase()}.js`;
						const candidates = hacsJson.content_in_root ? [filename, `dist/${filename}`] : [
							`dist/${filename}`,
							filename,
							`dist/${path.basename(filename)}`
						];
						for (const cand of candidates) {
							const testUrl = `https://raw.githubusercontent.com/${author}/${repoName}/${branch}/${cand}`;
							try {
								const downloadRes = await fetch(testUrl);
								if (downloadRes.ok) {
									const text = await downloadRes.text();
									if (text.length > 200) {
										jsContent = text;
										foundUrl = testUrl;
										detectedFileName = path.basename(cand);
										break;
									}
								}
							} catch {}
						}
					}
				} catch {}
				if (jsContent) break;
			}
			if (!jsContent) try {
				const releaseRes = await fetch(`https://api.github.com/repos/${author}/${repoName}/releases/latest`, { headers: { "User-Agent": "ha-fusion" } });
				if (releaseRes.ok) {
					const jsAsset = (await releaseRes.json()).assets?.find((a) => a.name?.endsWith(".js"));
					if (jsAsset && jsAsset.browser_download_url) {
						foundUrl = jsAsset.browser_download_url;
						const downloadRes = await fetch(foundUrl);
						if (downloadRes.ok) {
							jsContent = await downloadRes.text();
							detectedFileName = jsAsset.name;
						}
					}
				}
			} catch {}
			if (!jsContent) {
				const candidateNames = [
					`dist/${repoName.toLowerCase()}.js`,
					`dist/${repoName}.js`,
					`${repoName.toLowerCase()}.js`,
					`${repoName}.js`,
					`dist/${repoName.replace(/_/g, "-")}.js`,
					`dist/${repoName.replace(/-/g, "_")}.js`,
					`${repoName.replace(/_/g, "-")}.js`,
					`${repoName.replace(/-/g, "_")}.js`,
					"dist/index.js",
					"dist/card.js",
					"dist/bundle.js",
					"dist/main.js",
					`${repoName.toLowerCase()}.min.js`,
					`${repoName}.min.js`
				];
				for (const branch of branches) {
					for (const candidate of candidateNames) {
						const testUrl = `https://raw.githubusercontent.com/${author}/${repoName}/${branch}/${candidate}`;
						try {
							const res = await fetch(testUrl);
							if (res.ok) {
								const text = await res.text();
								if (text.length > 200) {
									jsContent = text;
									foundUrl = testUrl;
									detectedFileName = path.basename(candidate);
									break;
								}
							}
						} catch {}
					}
					if (jsContent) break;
				}
			}
			let treeIsThemeOnly = false;
			if (!jsContent) for (const branch of branches) {
				try {
					const treeRes = await fetch(`https://api.github.com/repos/${author}/${repoName}/git/trees/${branch}?recursive=1`, { headers: { "User-Agent": "ha-fusion" } });
					if (treeRes.ok) {
						const treeJson = await treeRes.json();
						const tree = Array.isArray(treeJson.tree) ? treeJson.tree : [];
						const jsEntries = tree.filter((t) => t.path?.endsWith(".js") && !t.path?.includes("test") && !t.path?.includes("config"));
						if (jsEntries.length === 0) {
							if (tree.some((t) => t.path?.startsWith("themes") || t.path?.endsWith(".yaml"))) treeIsThemeOnly = true;
						} else {
							const best = jsEntries.find((e) => e.path?.startsWith("dist/") || e.path?.includes("card")) || jsEntries[0];
							if (best?.path) {
								const rawUrl = `https://raw.githubusercontent.com/${author}/${repoName}/${branch}/${best.path}`;
								const downloadRes = await fetch(rawUrl);
								if (downloadRes.ok) {
									const text = await downloadRes.text();
									if (text.length > 200) {
										jsContent = text;
										foundUrl = rawUrl;
										detectedFileName = path.basename(best.path);
										break;
									}
								}
							}
						}
					}
				} catch {}
				if (jsContent) break;
			}
			if (!jsContent) {
				if (treeIsThemeOnly) return error(400, `Repozitorij "${author}/${repoName}" je tema/kolekcija ikona, a ne Lovelace JavaScript kartica. Ha-Fusion podržava Lovelace kartice (npr. Bubble Card, Mushroom itd.).`);
				return error(404, `Nije moguće pronaći .js datoteku u repozitoriju "${author}/${repoName}". Molimo unesite direktan .js URL do kartice.`);
			}
			const saveName = detectedFileName || `${repoName.toLowerCase()}.js`;
			await mkdir(CARDS_DIR, { recursive: true });
			await writeFile(path.join(CARDS_DIR, saveName), jsContent, "utf8");
			const details = detectCardDetails(jsContent, saveName, repoName, tag);
			let cards = [];
			if (existsSync(METADATA_FILE)) try {
				cards = JSON.parse(await readFile(METADATA_FILE, "utf8"));
			} catch {}
			const cardEntry = {
				id: details.cardId,
				name: name || details.cardName,
				tag: details.detectedTag,
				file: saveName,
				url,
				author,
				description: details.description,
				installed_at: (/* @__PURE__ */ new Date()).toISOString(),
				default_config: details.defaultConfig,
				...details.subCards ? { sub_cards: details.subCards } : {}
			};
			cards = cards.filter((c) => c.id !== details.cardId && c.file !== saveName);
			cards.push(cardEntry);
			await writeFile(METADATA_FILE, JSON.stringify(cards, null, 2), "utf8");
			return json({
				ok: true,
				card: cardEntry
			});
		}
		if (downloadUrl.endsWith(".js") || downloadUrl.includes(".js?")) {
			const res = await fetch(downloadUrl);
			if (!res.ok) return error(res.status, `Preuzimanje datoteke nije uspjelo: ${res.statusText}`);
			const jsContent = await res.text();
			const parsedUrl = new URL(downloadUrl);
			const originalName = path.basename(parsedUrl.pathname) || "custom-card.js";
			const saveName = originalName.endsWith(".js") ? originalName : `${originalName}.js`;
			await mkdir(CARDS_DIR, { recursive: true });
			await writeFile(path.join(CARDS_DIR, saveName), jsContent, "utf8");
			const details = detectCardDetails(jsContent, saveName, originalName, tag);
			let cards = [];
			if (existsSync(METADATA_FILE)) try {
				cards = JSON.parse(await readFile(METADATA_FILE, "utf8"));
			} catch {}
			const cardEntry = {
				id: details.cardId,
				name: name || details.cardName,
				tag: details.detectedTag,
				file: saveName,
				url: downloadUrl,
				description: details.description,
				installed_at: (/* @__PURE__ */ new Date()).toISOString(),
				default_config: details.defaultConfig,
				...details.subCards ? { sub_cards: details.subCards } : {}
			};
			cards = cards.filter((c) => c.id !== details.cardId && c.file !== saveName);
			cards.push(cardEntry);
			await writeFile(METADATA_FILE, JSON.stringify(cards, null, 2), "utf8");
			return json({
				ok: true,
				card: cardEntry
			});
		}
		return error(400, "Nepodržan format URL-a. Unesite GitHub repozitorij ili direktan link do .js datoteke.");
	} catch (err) {
		if (err && typeof err.status === "number") throw err;
		console.error("Failed to install custom card:", err);
		return error(500, err?.message || "Greška pri instalaciji prilagođene kartice");
	}
};
//#endregion
export { POST };
