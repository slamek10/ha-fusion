import { x as error, j as json } from '../../../../../chunks/utils.js-DLsluu6x.js';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import zlib from 'zlib';
import '../../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/bills/upload/+server.ts
var UPLOAD_DIR = "./data/bills_files";
/**
* Decodes hexadecimal string in PDF (e.g. <372C3939> or UTF-16BE <0037002C00390039>)
*/
function decodePdfHexString(hexStr) {
	const cleanHex = hexStr.replace(/\s+/g, "");
	if (cleanHex.length % 2 !== 0) return "";
	try {
		const buf = Buffer.from(cleanHex, "hex");
		if (buf.length >= 2 && buf.length % 2 === 0) {
			if (buf[0] === 254 && buf[1] === 255) return Buffer.from(buf.subarray(2)).swap16().toString("utf16le");
			if (buf.length >= 4 && buf[0] === 0 && buf[2] === 0) return Buffer.from(buf).swap16().toString("utf16le");
		}
		return buf.toString("latin1");
	} catch {
		return "";
	}
}
/**
* Extracts visible text strings from a PDF buffer (decompresses Flate streams).
*/
function extractTextFromPdf(buffer) {
	let combinedText = "";
	const streamMarker = Buffer.from("stream");
	const endstreamMarker = Buffer.from("endstream");
	let pos = 0;
	while (pos < buffer.length) {
		const streamIdx = buffer.indexOf(streamMarker, pos);
		if (streamIdx === -1) break;
		let contentStart = streamIdx + 6;
		if (buffer[contentStart] === 13 && buffer[contentStart + 1] === 10) contentStart += 2;
		else if (buffer[contentStart] === 10 || buffer[contentStart] === 13) contentStart += 1;
		const endIdx = buffer.indexOf(endstreamMarker, contentStart);
		if (endIdx === -1) break;
		let contentEnd = endIdx;
		if (contentEnd > contentStart && (buffer[contentEnd - 1] === 10 || buffer[contentEnd - 1] === 13)) {
			contentEnd--;
			if (contentEnd > contentStart && (buffer[contentEnd - 1] === 10 || buffer[contentEnd - 1] === 13)) contentEnd--;
		}
		const streamChunk = buffer.subarray(contentStart, contentEnd);
		try {
			const decompressed = zlib.inflateSync(streamChunk);
			combinedText += " " + decompressed.toString("utf8");
		} catch {
			try {
				const decompressedRaw = zlib.inflateRawSync(streamChunk);
				combinedText += " " + decompressedRaw.toString("utf8");
			} catch {
				combinedText += " " + streamChunk.toString("latin1");
			}
		}
		pos = endIdx + 9;
	}
	combinedText += " " + buffer.toString("latin1");
	let parsedWords = "";
	const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
	let tjMatch;
	while ((tjMatch = tjRegex.exec(combinedText)) !== null) parsedWords += " " + tjMatch[1];
	const arrayTjRegex = /\[([^\]]+)\]\s*TJ/g;
	let arrayMatch;
	while ((arrayMatch = arrayTjRegex.exec(combinedText)) !== null) {
		const subRegex = /\(([^)]+)\)/g;
		let subMatch;
		while ((subMatch = subRegex.exec(arrayMatch[1])) !== null) parsedWords += " " + subMatch[1];
		const hexSubRegex = /<([0-9a-fA-F]+)>/g;
		let hexSubMatch;
		while ((hexSubMatch = hexSubRegex.exec(arrayMatch[1])) !== null) parsedWords += " " + decodePdfHexString(hexSubMatch[1]);
	}
	const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
	let hexTjMatch;
	while ((hexTjMatch = hexTjRegex.exec(combinedText)) !== null) parsedWords += " " + decodePdfHexString(hexTjMatch[1]);
	return (parsedWords + " " + combinedText).replace(/\\([()\\])/g, "$1");
}
/**
* Parses extracted text to detect bill amounts, dates, and provider hints.
*/
function _parseBillInfoFromText(text) {
	let amount = null;
	let due_date = null;
	let issue_date = null;
	let provider_hint = null;
	let type_hint = null;
	let title_hint = null;
	const clean = text.replace(/\s+/g, " ");
	for (const reg of [
		/(?:za\s*uplatu|ukupno\s*za\s*uplatu|ukupno|sveukupno|iznos\s*računa|iznos\s*premije|premija|iznos|ukupno\s*dugovanje|stanje\s*duga|preostalo\s*za\s*uplatu|dospjeli\s*iznos|total|amount\s*due|due\s*amount)\s*(?:\((?:eur|€|kn|hrk)\))?\s*[:=]\s*(?:(?:eur|€|kn|hrk)\s*[:=]?)?\s*([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,
		/(?:eur|€)?\s*=\s*\*?\*?\*?\s*([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,
		/(?:(?:\((?:eur|€)\)\s*[:=])|(?:eur|€)\s*[:=])\s*([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,
		/(?:za\s*uplatu|ukupno\s*za\s*uplatu|ukupno|sveukupno|iznos\s*računa|iznos|total|amount)\s+(?:\((?:eur|€)\)|eur|€)\s+([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,
		/([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])\s*(?:€|eur)/i,
		/([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])\s*(?:kn|hrk)/i
	]) {
		const m = reg.exec(clean);
		if (m && m[1]) {
			let numStr = m[1].replace(/\s+/g, "");
			if (numStr.includes(",") && numStr.includes(".")) numStr = numStr.replace(/\./g, "").replace(",", ".");
			else if (numStr.includes(",")) numStr = numStr.replace(",", ".");
			const parsed = parseFloat(numStr);
			if (!isNaN(parsed) && parsed > 0 && parsed < 1e6) {
				amount = parsed;
				break;
			}
		}
	}
	for (const reg of [/(?:rok\s*plaćanja|datum\s*dospijeća|dospijeće|valuta|rok\s*za\s*uplatu|due\s*date)\s*[:=]?\s*([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-]\s*[0-9]{2,4})/i, /(?:platiti\s*do|dospijeva)\s*[:=]?\s*([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-]\s*[0-9]{2,4})/i]) {
		const m = reg.exec(clean);
		if (m && m[1]) {
			due_date = normalizeDateString(m[1]);
			if (due_date) break;
		}
	}
	for (const reg of [/(?:datum\s*izdavanja|datum\s*računa|datum\s*obracuna|datum\s*dokumenta|datum\s*ponude|issue\s*date)\s*[:=]?\s*([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-]\s*[0-9]{2,4})/i, /(?:datum\s*računa|datum\s*izdavanja)[\s\S]{1,80}?([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-][0-9]{4})/i]) {
		const m = reg.exec(clean);
		if (m && m[1]) {
			issue_date = normalizeDateString(m[1]);
			if (issue_date) break;
		}
	}
	const lower = clean.toLowerCase();
	if (lower.includes("uniqa")) {
		provider_hint = "Uniqa Osiguranje";
		type_hint = "insurance";
	} else if (lower.includes("croatia osiguranje")) {
		provider_hint = "Croatia Osiguranje";
		type_hint = "insurance";
	} else if (lower.includes("allianz")) {
		provider_hint = "Allianz";
		type_hint = "insurance";
	} else if (lower.includes("generali")) {
		provider_hint = "Generali";
		type_hint = "insurance";
	} else if (lower.includes("wiener")) {
		provider_hint = "Wiener Osiguranje";
		type_hint = "insurance";
	} else if (lower.includes("grawe")) {
		provider_hint = "Grawe";
		type_hint = "insurance";
	} else if (lower.includes("triglav")) {
		provider_hint = "Triglav";
		type_hint = "insurance";
	} else if (lower.includes("osiguranje") || lower.includes("premij")) {
		provider_hint = "Osiguranje";
		type_hint = "insurance";
	} else if (lower.includes("hrvatski telekom") || lower.includes("t-com") || lower.includes("telekom")) {
		provider_hint = "Hrvatski Telekom";
		type_hint = "internet";
	} else if (lower.includes("a1 hrvatska") || lower.includes("a1")) {
		provider_hint = "A1";
		type_hint = lower.includes("mobil") ? "mobile" : "internet";
	} else if (lower.includes("telemach")) {
		provider_hint = "Telemach";
		type_hint = "mobile";
	} else if (lower.includes("hep") || lower.includes("elektra") || lower.includes("struj") || lower.includes("električ")) {
		provider_hint = "HEP Elektra";
		type_hint = "electricity";
	} else if (lower.includes("plin") || lower.includes("plinara") || lower.includes("grijanj")) {
		provider_hint = "Plinara";
		type_hint = "heating";
	} else if (lower.includes("vodovod") || lower.includes("odvodnj") || lower.includes("voda")) {
		provider_hint = "Vodovod";
		type_hint = "water";
	} else if (lower.includes("čistoć") || lower.includes("komunal") || lower.includes("otpad")) {
		provider_hint = "Komunalac";
		type_hint = "communal";
	}
	if (type_hint === "insurance") if (lower.includes("dzo") || lower.includes("zdrav")) title_hint = "Dopunsko zdravstveno osiguranje";
	else if (lower.includes("kuć") || lower.includes("dom") || lower.includes("imovin")) title_hint = "Osiguranje kuće / imovine";
	else if (lower.includes("auto") || lower.includes("kasko")) title_hint = "Auto osiguranje";
	else title_hint = "Osiguranje";
	return {
		amount,
		due_date,
		issue_date,
		provider_hint,
		type_hint,
		title_hint
	};
}
function normalizeDateString(str) {
	const parts = str.replace(/[.]+/g, ".").trim().split(/[./-]/).filter(Boolean);
	if (parts.length >= 3) {
		let day = parseInt(parts[0], 10);
		let month = parseInt(parts[1], 10);
		let year = parseInt(parts[2], 10);
		if (year < 100) year += 2e3;
		if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2e3 && year <= 2100) {
			const dStr = String(day).padStart(2, "0");
			const mStr = String(month).padStart(2, "0");
			return `${year}-${mStr}-${dStr}`;
		}
	}
	return null;
}
var POST = async ({ request }) => {
	try {
		if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
		const contentType = request.headers.get("content-type") || "";
		let fileBuffer = null;
		let ext = "pdf";
		let originalName = "bill";
		if (contentType.includes("multipart/form-data")) {
			const file = (await request.formData()).get("file");
			if (!file || !(file instanceof File)) return error(400, "No file provided in form data");
			originalName = file.name;
			const arrayBuffer = await file.arrayBuffer();
			fileBuffer = Buffer.from(arrayBuffer);
			const parsedExt = path.extname(file.name).toLowerCase().replace(".", "");
			if ([
				"pdf",
				"png",
				"jpg",
				"jpeg",
				"webp"
			].includes(parsedExt)) ext = parsedExt === "jpeg" ? "jpg" : parsedExt;
		} else if (contentType.includes("application/json")) {
			const body = await request.json();
			if (!body?.file && !body?.image) return error(400, "Missing \"file\" or \"image\" in JSON payload");
			const rawData = body.file || body.image;
			if (body.name) {
				originalName = body.name;
				const parsedExt = path.extname(body.name).toLowerCase().replace(".", "");
				if ([
					"pdf",
					"png",
					"jpg",
					"jpeg",
					"webp"
				].includes(parsedExt)) ext = parsedExt === "jpeg" ? "jpg" : parsedExt;
			}
			const match = rawData.match(/^data:([^;]+);base64,(.+)$/);
			if (match) {
				const mime = match[1].toLowerCase();
				if (mime.includes("pdf")) ext = "pdf";
				else if (mime.includes("png")) ext = "png";
				else if (mime.includes("webp")) ext = "webp";
				else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
				fileBuffer = Buffer.from(match[2], "base64");
			} else fileBuffer = Buffer.from(rawData, "base64");
		} else return error(400, "Unsupported Content-Type");
		if (!fileBuffer || fileBuffer.length === 0) return error(400, "Uploaded file is empty");
		const savedFileName = `${Date.now()}_${originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)}.${ext}`;
		await writeFile(path.join(UPLOAD_DIR, savedFileName), fileBuffer);
		let extracted = {
			amount: null,
			due_date: null,
			issue_date: null,
			provider_hint: null,
			type_hint: null,
			title_hint: null
		};
		if (ext === "pdf") try {
			extracted = _parseBillInfoFromText(extractTextFromPdf(fileBuffer));
		} catch (parseErr) {
			console.warn("PDF stream extraction error:", parseErr);
		}
		return json({
			ok: true,
			file_url: `/_api/bills/file?name=${encodeURIComponent(savedFileName)}`,
			file_name: savedFileName,
			original_name: originalName,
			file_type: ext === "pdf" ? "application/pdf" : `image/${ext}`,
			file_size: fileBuffer.length,
			extracted
		});
	} catch (err) {
		console.error("Bill upload failed:", err);
		return error(500, err?.message || "Failed to upload bill");
	}
};

export { POST, _parseBillInfoFromText };
//# sourceMappingURL=_server.ts.js-DUwCcIqt.js.map
