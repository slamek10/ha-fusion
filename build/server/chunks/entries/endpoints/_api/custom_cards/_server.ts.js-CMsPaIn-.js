import { x as error, j as json } from '../../../../chunks/utils.js-DLsluu6x.js';
import { readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import '../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/custom_cards/+server.ts
var METADATA_FILE = "./data/custom_cards.json";
var GET = async ({ setHeaders }) => {
	setHeaders({ "Cache-Control": "no-cache, no-store, must-revalidate" });
	try {
		if (!existsSync(METADATA_FILE)) {
			await writeFile(METADATA_FILE, "[]", "utf8");
			return json([]);
		}
		const raw = await readFile(METADATA_FILE, "utf8");
		return json(JSON.parse(raw));
	} catch (err) {
		return error(500, err?.message || "Failed to read custom cards");
	}
};
var DELETE = async ({ url }) => {
	const id = url.searchParams.get("id");
	if (!id) return error(400, "Missing id parameter");
	try {
		if (!existsSync(METADATA_FILE)) return json({ ok: true });
		const raw = await readFile(METADATA_FILE, "utf8");
		let cards = JSON.parse(raw);
		const targetCard = cards.find((c) => c.id === id);
		if (targetCard && targetCard.file) {
			const filePath = path.join("./data/custom_cards", targetCard.file);
			if (existsSync(filePath)) try {
				await unlink(filePath);
			} catch {}
		}
		cards = cards.filter((c) => c.id !== id);
		await writeFile(METADATA_FILE, JSON.stringify(cards, null, 2), "utf8");
		return json({
			ok: true,
			cards
		});
	} catch (err) {
		return error(500, err?.message || "Failed to delete custom card");
	}
};

export { DELETE, GET };
//# sourceMappingURL=_server.ts.js-CMsPaIn-.js.map
