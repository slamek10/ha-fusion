import { x as error, j as json } from '../../../../../chunks/utils.js-DLsluu6x.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import '../../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/waste_collection/ai_extract/+server.ts
var PROMPT = `You are an expert OCR and schedule extraction assistant.
Analyze this municipal waste collection calendar image (like MURS-EKOM or similar Croatian/European waste management calendar).
Notice each month has specific dates, and under each date there are colored bin icons:
- Brown bin = Bio otpad
- Green bin = Miješani komunalni otpad
- Yellow bin = Plastika
- Blue bin = Papir
- Grey bin = Metal, tetrapak, staklena ambalaža
Also check the bottom notes for special collections like:
- Božićna drvca
- Glomazni komunalni otpad
- Glomazni otpad granje

Extract all dates for the entire year for every waste category.
Format dates strictly as YYYY-MM-DD (e.g., 2026-01-07).
Return ONLY a valid JSON object with no markdown formatting or commentary:
{
  "location": "string",
  "year": number,
  "categories": [
    {
      "id": "bio",
      "name": "Bio otpad",
      "color": "#8D6E63",
      "icon": "mdi:leaf",
      "dates": ["YYYY-MM-DD", ...]
    },
    {
      "id": "komunalni",
      "name": "Miješani komunalni otpad",
      "color": "#4CAF50",
      "icon": "mdi:trash-can",
      "dates": ["YYYY-MM-DD", ...]
    },
    {
      "id": "plastika",
      "name": "Plastika",
      "color": "#FBC02D",
      "icon": "mdi:recycle",
      "dates": ["YYYY-MM-DD", ...]
    },
    {
      "id": "papir",
      "name": "Papir",
      "color": "#1E88E5",
      "icon": "mdi:package-variant",
      "dates": ["YYYY-MM-DD", ...]
    },
    {
      "id": "metal_staklo",
      "name": "Metal, tetrapak, staklo",
      "color": "#90A4AE",
      "icon": "mdi:glass-cocktail",
      "dates": ["YYYY-MM-DD", ...]
    }
  ]
}`;
var POST = async ({ request }) => {
	try {
		const body = await request.json();
		const { apiKey, provider = "gemini", model } = body;
		if (!apiKey || typeof apiKey !== "string") return error(400, "API key is required for AI extraction");
		let imageBase64 = body.imageBase64;
		let mimeType = "image/png";
		if (!imageBase64) {
			for (const candidate of [
				"./data/waste_collection_calendar.png",
				"./data/waste_collection_calendar.jpg",
				"./data/waste_collection_calendar.jpeg",
				"./data/waste_collection_calendar.webp"
			]) if (existsSync(candidate)) {
				imageBase64 = (await readFile(candidate)).toString("base64");
				const ext = path.extname(candidate).toLowerCase();
				mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
				break;
			}
		}
		if (!imageBase64) return error(400, "No calendar image found to extract from");
		if (imageBase64.includes(";base64,")) {
			const parts = imageBase64.split(";base64,");
			mimeType = parts[0].replace("data:", "") || "image/png";
			imageBase64 = parts[1];
		}
		let parsedResult = null;
		if (provider === "gemini") {
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.5-flash"}:generateContent?key=${apiKey.trim()}`;
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ parts: [{ text: PROMPT }, { inlineData: {
						mimeType,
						data: imageBase64
					} }] }],
					generationConfig: { responseMimeType: "application/json" }
				})
			});
			if (!response.ok) {
				const errText = await response.text();
				return error(response.status, `Gemini API error: ${errText}`);
			}
			const textResponse = (await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
			parsedResult = JSON.parse(textResponse);
		} else if (provider === "openai") {
			const selectedModel = model || "gpt-4o";
			const response = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey.trim()}`
				},
				body: JSON.stringify({
					model: selectedModel,
					response_format: { type: "json_object" },
					messages: [{
						role: "user",
						content: [{
							type: "text",
							text: PROMPT
						}, {
							type: "image_url",
							image_url: { url: `data:${mimeType};base64,${imageBase64}` }
						}]
					}]
				})
			});
			if (!response.ok) {
				const errText = await response.text();
				return error(response.status, `OpenAI API error: ${errText}`);
			}
			const content = (await response.json())?.choices?.[0]?.message?.content || "{}";
			parsedResult = JSON.parse(content);
		} else return error(400, `Unsupported provider: ${provider}`);
		return json({
			ok: true,
			data: parsedResult
		});
	} catch (err) {
		return error(500, err?.message || "Failed to extract schedule with AI");
	}
};

export { POST };
//# sourceMappingURL=_server.ts.js-DvcimR6j.js.map
