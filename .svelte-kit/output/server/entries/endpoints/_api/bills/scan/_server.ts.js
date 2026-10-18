import { error, json } from "@sveltejs/kit";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
//#region src/routes/_api/bills/scan/+server.ts
var PROMPT = `You are an expert document OCR and invoice processing assistant.
Analyze this utility bill / invoice / insurance document (e.g. Insurance, Electricity, Internet, Mobile phone, Water, Gas, Waste).
Extract the following key details:
1. Total amount to pay ("iznos", "ukupno za uplatu", "total", "amount due", "premija", or HUB3A payment slip "EUR =..."). Return as a floating point number (e.g. 7.99).
2. Due date ("rok plaćanja", "dospijeće", "due date"). Format strictly as YYYY-MM-DD.
3. Issue date ("datum računa", "datum izdavanja"). Format strictly as YYYY-MM-DD.
4. Provider or company name (e.g. "UNIQA osiguranje", "A1 Hrvatska", "HEP Elektra", "Hrvatski Telekom", "Telemach", "Vodovod", "Gradska plinara").
5. Bill title or description (e.g. "Dopunsko zdravstveno osiguranje", "Internet i TV", "Mobilna pretplata", "Električna energija").
6. Type hint: one of "insurance", "internet", "electricity", "mobile", "water", "heating", "communal", or "other".
7. Invoice / reference number ("broj računa", "poziv na broj").

Return ONLY a valid JSON object with no markdown formatting or commentary:
{
  "amount": number,
  "currency": "€",
  "due_date": "YYYY-MM-DD",
  "issue_date": "YYYY-MM-DD",
  "provider": "string",
  "title": "string",
  "type_hint": "insurance | internet | electricity | mobile | water | heating | communal | other",
  "invoice_number": "string"
}`;
var POST = async ({ request }) => {
	try {
		const { fileName, fileBase64, mimeType = "image/jpeg", apiKey, provider = "gemini", model } = await request.json();
		let fileData = fileBase64;
		let mime = mimeType;
		if (!fileData && fileName) {
			const safeName = path.basename(fileName);
			const fullPath = path.join("./data/bills_files", safeName);
			if (existsSync(fullPath)) {
				const buffer = await readFile(fullPath);
				const ext = path.extname(safeName).toLowerCase();
				mime = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
				fileData = buffer.toString("base64");
			}
		}
		if (!fileData) return error(400, "No bill file or base64 provided");
		if (fileData.includes(";base64,")) {
			const parts = fileData.split(";base64,");
			mime = parts[0].replace("data:", "") || mime;
			fileData = parts[1];
		}
		const key = (apiKey || "").trim() || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
		if (!key) return error(400, "API key is required for AI scanning");
		let parsedResult = null;
		if (provider === "gemini") {
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.5-flash"}:generateContent?key=${key}`;
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ parts: [{ text: PROMPT }, { inlineData: {
						mimeType: mime,
						data: fileData
					} }] }],
					generationConfig: { responseMimeType: "application/json" }
				})
			});
			if (!response.ok) {
				const errText = await response.text();
				return error(response.status, `Gemini API error: ${errText}`);
			}
			const textResponse = (await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
			parsedResult = JSON.parse(textResponse);
		} else if (provider === "openai") {
			const selectedModel = model || "gpt-4o";
			const response = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${key}`
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
							image_url: { url: `data:${mime};base64,${fileData}` }
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
		} else return error(400, `Unsupported AI provider: ${provider}`);
		return json({
			ok: true,
			data: parsedResult
		});
	} catch (err) {
		console.error("Scan error:", err);
		return error(500, err?.message || "Failed to scan bill");
	}
};
//#endregion
export { POST };
