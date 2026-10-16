import { error, json } from "@sveltejs/kit";
import { readFile, writeFile } from "fs/promises";
//#region src/routes/_api/waste_collection/+server.ts
var DATA_FILE = "./data/waste_collection.json";
var DEFAULT_DATA = {
	calendar_image: "/_api/waste_collection/image",
	has_calendar_image: true,
	last_updated: (/* @__PURE__ */ new Date()).toISOString(),
	location: "Grad Mursko Središće",
	year: 2026,
	categories: [
		{
			id: "bio",
			name: "Bio otpad",
			color: "#8D6E63",
			icon: "mdi:leaf",
			dates: [
				"2026-01-07",
				"2026-01-21",
				"2026-02-04",
				"2026-02-18",
				"2026-03-04",
				"2026-03-18",
				"2026-04-01",
				"2026-04-15",
				"2026-04-29",
				"2026-05-13",
				"2026-05-27",
				"2026-06-10",
				"2026-06-24",
				"2026-07-08",
				"2026-07-22",
				"2026-08-07",
				"2026-08-19",
				"2026-09-02",
				"2026-09-16",
				"2026-09-30",
				"2026-10-14",
				"2026-10-28",
				"2026-11-11",
				"2026-11-25",
				"2026-12-09",
				"2026-12-23"
			]
		},
		{
			id: "komunalni",
			name: "Miješani komunalni otpad",
			color: "#4CAF50",
			icon: "mdi:trash-can",
			dates: [
				"2026-01-07",
				"2026-01-21",
				"2026-02-04",
				"2026-02-18",
				"2026-03-04",
				"2026-03-18",
				"2026-04-01",
				"2026-04-15",
				"2026-04-29",
				"2026-05-13",
				"2026-05-27",
				"2026-06-10",
				"2026-06-24",
				"2026-07-08",
				"2026-07-22",
				"2026-08-07",
				"2026-08-19",
				"2026-09-02",
				"2026-09-16",
				"2026-09-30",
				"2026-10-14",
				"2026-10-28",
				"2026-11-11",
				"2026-11-25",
				"2026-12-09",
				"2026-12-23"
			]
		},
		{
			id: "plastika",
			name: "Plastika",
			color: "#FBC02D",
			icon: "mdi:recycle",
			dates: [
				"2026-01-13",
				"2026-02-10",
				"2026-03-10",
				"2026-04-07",
				"2026-05-05",
				"2026-06-02",
				"2026-06-30",
				"2026-07-28",
				"2026-08-25",
				"2026-09-22",
				"2026-10-20",
				"2026-11-17",
				"2026-12-15"
			]
		},
		{
			id: "papir",
			name: "Papir",
			color: "#1E88E5",
			icon: "mdi:package-variant",
			dates: [
				"2026-01-13",
				"2026-02-10",
				"2026-03-10",
				"2026-04-07",
				"2026-05-05",
				"2026-06-02",
				"2026-06-30",
				"2026-07-28",
				"2026-08-25",
				"2026-09-22",
				"2026-10-20",
				"2026-11-17",
				"2026-12-15"
			]
		},
		{
			id: "metal_staklo",
			name: "Metal, tetrapak, staklo",
			color: "#90A4AE",
			icon: "mdi:glass-cocktail",
			dates: [
				"2026-01-16",
				"2026-02-13",
				"2026-03-13",
				"2026-04-10",
				"2026-05-08",
				"2026-06-05",
				"2026-07-03",
				"2026-07-31",
				"2026-08-28",
				"2026-09-25",
				"2026-10-23",
				"2026-11-20",
				"2026-12-18"
			]
		},
		{
			id: "bozicna_drvca",
			name: "Božićna drvca",
			color: "#2E7D32",
			icon: "mdi:pine-tree",
			dates: ["2026-01-07", "2026-01-21"]
		},
		{
			id: "glomazni_otpad",
			name: "Glomazni komunalni otpad",
			color: "#E53935",
			icon: "mdi:dump-truck",
			dates: [
				"2026-02-25",
				"2026-04-22",
				"2026-06-17",
				"2026-08-12",
				"2026-10-07"
			]
		},
		{
			id: "glomazni_granje",
			name: "Glomazni otpad - granje",
			color: "#6D4C41",
			icon: "mdi:tree",
			dates: ["2026-03-18", "2026-12-02"]
		}
	]
};
var GET = async ({ setHeaders }) => {
	setHeaders({ "Cache-Control": "no-cache, no-store, must-revalidate" });
	try {
		const raw = await readFile(DATA_FILE, "utf8");
		return json(JSON.parse(raw));
	} catch (err) {
		if (err?.code === "ENOENT") {
			try {
				await writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), "utf8");
			} catch {}
			return json(DEFAULT_DATA);
		}
		return error(500, err?.message || "Failed to read waste collection data");
	}
};
var POST = async ({ request }) => {
	try {
		const payload = await request.json();
		if (!payload || typeof payload !== "object") return error(400, "Invalid JSON body");
		payload.last_updated = (/* @__PURE__ */ new Date()).toISOString();
		await writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
		return json({
			ok: true,
			data: payload
		});
	} catch (err) {
		return error(500, err?.message || "Failed to save waste collection data");
	}
};
//#endregion
export { GET, POST };
