import { error, json } from "@sveltejs/kit";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import * as yaml from "js-yaml";
import { Innertube, UniversalCache } from "youtubei.js";
//#region src/routes/_api/youtube/+server.ts
var youtube;
var event;
var credentialsFilePath = "./data/youtube_credentials.json";
/**
* Handle post requests
* poll, logout, history
*/
var POST = async ({ request }) => {
	const response = await request.json();
	const message = response?.message;
	if (message === "poll") return json(event || {});
	else if (message === "logout") try {
		try {
			await youtube?.session.signOut();
		} catch (err) {
			console.error(err);
		}
		unlinkSync(credentialsFilePath);
		const configFilePath = "./data/configuration.yaml";
		let config = await loadFile(configFilePath);
		if (config?.addons?.youtube) {
			delete config.addons.youtube;
			config = yaml.dump(config);
			writeFileSync(configFilePath, config);
		}
		return json({ message: "success" });
	} catch (err) {
		return error(500, err?.message);
	}
	else if (message === "history") try {
		youtube = await Innertube.create({ cache: new UniversalCache(false) });
		const events = new Promise((resolve) => {
			if (!youtube) return;
			youtube.session.on("auth-pending", () => {
				console.error("YouTube credentials have expired, please sign in again or turn off add-on.");
				resolve();
			});
			youtube.session.on("auth", async ({ credentials }) => {
				await saveFile(credentials);
				resolve();
			});
			youtube.session.on("update-credentials", async ({ credentials }) => {
				await saveFile(credentials);
				resolve();
			});
			youtube.session.on("auth-error", (error) => {
				console.error("YouTube add-on:", error);
				resolve();
			});
		});
		const auth = await loadFile(credentialsFilePath);
		await youtube.session.signIn(auth);
		await events;
		const { author, title, id, thumbnails } = ((await youtube.getLibrary())?.sections?.find((section) => section?.title?.text === "History"))?.contents.find((video) => {
			return video.author?.name === response?.media_artist && video.title?.text === response?.media_title;
		});
		const getThumbnail = async (id) => {
			const url = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
			if ((await fetch(url, { method: "HEAD" })).ok) return url;
		};
		const maxres = await getThumbnail(id);
		return json({
			media_artist: author?.name,
			media_title: title?.text,
			entity_picture: maxres || thumbnails?.[0]?.url
		});
	} catch (err) {
		error(500, err?.message);
	}
	return json({
		message: "error",
		error: "Unhandled post request"
	});
};
/**
* Init auth and return `AccountInfo`.
*/
var GET = async () => {
	try {
		youtube = await Innertube.create({ cache: new UniversalCache(false) });
		youtube.session.on("auth-pending", (data) => {
			event = {
				message: "auth-pending",
				verification_url: data?.verification_url,
				user_code: data?.user_code,
				timestamp: (/* @__PURE__ */ new Date()).getTime()
			};
		});
		youtube.session.on("auth", async ({ credentials }) => {
			event = { message: "auth" };
			await saveFile(credentials);
		});
		youtube.session.on("update-credentials", async ({ credentials }) => {
			event = { message: "update-credentials" };
			await saveFile(credentials);
		});
		youtube.session.on("auth-error", (error) => {
			event = {
				message: "auth-error",
				error
			};
		});
		let auth = await loadFile(credentialsFilePath);
		if (!Object.keys(auth)?.length) auth = void 0;
		await youtube.session.signIn(auth);
		const data = await youtube.account.getInfo();
		event = void 0;
		return json(data);
	} catch (err) {
		console.error(err);
		return error(500, err.message);
	}
};
/**
* Load file.
*/
async function loadFile(filePath) {
	try {
		const data = readFileSync(filePath, "utf8");
		if (!data.trim()) return {};
		else return filePath.endsWith(".yaml") ? yaml.load(data) : JSON.parse(data);
	} catch (err) {
		if (err?.code === "ENOENT") {} else console.error(`Error reading or parsing ${filePath}:`, err);
		return {};
	}
}
/**
* Save file.
*/
async function saveFile(credentials) {
	try {
		writeFileSync(credentialsFilePath, JSON.stringify(credentials, null, "	") + "\n");
	} catch (err) {
		console.error("Failed to save credentials:", err);
	}
}
//#endregion
export { GET, POST };
