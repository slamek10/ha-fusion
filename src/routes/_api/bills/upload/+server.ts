import { writeFile, mkdir } from "fs/promises";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import path from "path";
import { existsSync } from "fs";
import zlib from "zlib";

const UPLOAD_DIR = "./data/bills_files";

/**
 * Decodes hexadecimal string in PDF (e.g. <372C3939> or UTF-16BE <0037002C00390039>)
 */
function decodePdfHexString(hexStr: string): string {
  const cleanHex = hexStr.replace(/\s+/g, "");
  if (cleanHex.length % 2 !== 0) return "";
  try {
    const buf = Buffer.from(cleanHex, "hex");
    if (buf.length >= 2 && buf.length % 2 === 0) {
      if (buf[0] === 0xfe && buf[1] === 0xff) {
        return Buffer.from(buf.subarray(2)).swap16().toString("utf16le");
      }
      if (buf.length >= 4 && buf[0] === 0x00 && buf[2] === 0x00) {
        return Buffer.from(buf).swap16().toString("utf16le");
      }
    }
    return buf.toString("latin1");
  } catch {
    return "";
  }
}

/**
 * Extracts visible text strings from a PDF buffer (decompresses Flate streams).
 */
function extractTextFromPdf(buffer: Buffer): string {
  let combinedText = "";

  // 1. Extract FlateDecode and raw deflate streams using buffer byte scan
  const streamMarker = Buffer.from("stream");
  const endstreamMarker = Buffer.from("endstream");
  let pos = 0;

  while (pos < buffer.length) {
    const streamIdx = buffer.indexOf(streamMarker, pos);
    if (streamIdx === -1) break;

    let contentStart = streamIdx + 6;
    if (buffer[contentStart] === 0x0d && buffer[contentStart + 1] === 0x0a) {
      contentStart += 2;
    } else if (buffer[contentStart] === 0x0a || buffer[contentStart] === 0x0d) {
      contentStart += 1;
    }

    const endIdx = buffer.indexOf(endstreamMarker, contentStart);
    if (endIdx === -1) break;

    let contentEnd = endIdx;
    if (
      contentEnd > contentStart &&
      (buffer[contentEnd - 1] === 0x0a || buffer[contentEnd - 1] === 0x0d)
    ) {
      contentEnd--;
      if (
        contentEnd > contentStart &&
        (buffer[contentEnd - 1] === 0x0a || buffer[contentEnd - 1] === 0x0d)
      ) {
        contentEnd--;
      }
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

  // 2. Also search uncompressed literal text in PDF buffer
  combinedText += " " + buffer.toString("latin1");

  // 3. Extract text from PDF operators:
  let parsedWords = "";

  // Match (text) Tj, ', "
  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjRegex.exec(combinedText)) !== null) {
    parsedWords += " " + tjMatch[1];
  }

  // Match [(text)] TJ and [<hex>] TJ
  const arrayTjRegex = /\[([^\]]+)\]\s*TJ/g;
  let arrayMatch: RegExpExecArray | null;
  while ((arrayMatch = arrayTjRegex.exec(combinedText)) !== null) {
    const subRegex = /\(([^)]+)\)/g;
    let subMatch: RegExpExecArray | null;
    while ((subMatch = subRegex.exec(arrayMatch[1])) !== null) {
      parsedWords += " " + subMatch[1];
    }

    const hexSubRegex = /<([0-9a-fA-F]+)>/g;
    let hexSubMatch: RegExpExecArray | null;
    while ((hexSubMatch = hexSubRegex.exec(arrayMatch[1])) !== null) {
      parsedWords += " " + decodePdfHexString(hexSubMatch[1]);
    }
  }

  // Match <hex> Tj
  const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
  let hexTjMatch: RegExpExecArray | null;
  while ((hexTjMatch = hexTjRegex.exec(combinedText)) !== null) {
    parsedWords += " " + decodePdfHexString(hexTjMatch[1]);
  }

  return (parsedWords + " " + combinedText).replace(/\\([()\\])/g, "$1");
}

/**
 * Parses extracted text to detect bill amounts, dates, and provider hints.
 */
export function _parseBillInfoFromText(text: string): {
  amount: number | null;
  due_date: string | null;
  issue_date: string | null;
  provider_hint: string | null;
  type_hint: string | null;
  title_hint: string | null;
} {
  let amount: number | null = null;
  let due_date: string | null = null;
  let issue_date: string | null = null;
  let provider_hint: string | null = null;
  let type_hint: string | null = null;
  let title_hint: string | null = null;

  const clean = text.replace(/\s+/g, " ");

  // Detect Amount:
  // Priority 1: phrases with colons or equals, e.g. "Za uplatu (EUR): 7,99", "Ukupno (EUR): 7,99", "Premija EUR: 7,99", "EUR =7,99"
  // Ensure the 2 decimal digits are NOT followed by another digit (?![0-9]) so policy numbers like "1. 0204215101" are rejected!
  const amountRegexes = [
    // 1. Explicit payment phrases with mandatory colon or equals:
    // e.g. "Za uplatu (EUR): 7,99", "Ukupno (EUR): 7,99", "Ukupno za uplatu: 7,99", "Premija EUR: 7,99"
    /(?:za\s*uplatu|ukupno\s*za\s*uplatu|ukupno|sveukupno|iznos\s*računa|iznos\s*premije|premija|iznos|ukupno\s*dugovanje|stanje\s*duga|preostalo\s*za\s*uplatu|dospjeli\s*iznos|total|amount\s*due|due\s*amount)\s*(?:\((?:eur|€|kn|hrk)\))?\s*[:=]\s*(?:(?:eur|€|kn|hrk)\s*[:=]?)?\s*([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,

    // 2. Croatian HUB3A / SEPA payment slip amount format:
    // e.g. "EUR =7,99", "EUR = 7,99", "=***7,99", "=7,99"
    /(?:eur|€)?\s*=\s*\*?\*?\*?\s*([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,

    // 3. Currency symbol/code with colon/equals:
    // e.g. "EUR: 7,99", "(EUR): 7,99", "€: 7,99"
    /(?:(?:\((?:eur|€)\)\s*[:=])|(?:eur|€)\s*[:=])\s*([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,

    // 4. Phrases without colon, but with explicit currency:
    // e.g. "Za uplatu (EUR) 7,99" or "Ukupno 7,99 EUR"
    /(?:za\s*uplatu|ukupno\s*za\s*uplatu|ukupno|sveukupno|iznos\s*računa|iznos|total|amount)\s+(?:\((?:eur|€)\)|eur|€)\s+([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])/i,

    // 5. Number followed by currency symbol/code:
    // e.g. "7,99 EUR", "7,99 €", "7.99 EUR"
    /([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])\s*(?:€|eur)/i,

    // 6. Older Kuna bills:
    /([0-9]{1,4}(?:[.\s][0-9]{3})*\s*[.,]\s*[0-9]{2})(?![0-9])\s*(?:kn|hrk)/i,
  ];

  for (const reg of amountRegexes) {
    const m = reg.exec(clean);
    if (m && m[1]) {
      let numStr = m[1].replace(/\s+/g, "");
      if (numStr.includes(",") && numStr.includes(".")) {
        numStr = numStr.replace(/\./g, "").replace(",", ".");
      } else if (numStr.includes(",")) {
        numStr = numStr.replace(",", ".");
      }
      const parsed = parseFloat(numStr);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
        amount = parsed;
        break;
      }
    }
  }

  // Detect Due Date:
  const dueDateRegexes = [
    /(?:rok\s*plaćanja|datum\s*dospijeća|dospijeće|valuta|rok\s*za\s*uplatu|due\s*date)\s*[:=]?\s*([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-]\s*[0-9]{2,4})/i,
    /(?:platiti\s*do|dospijeva)\s*[:=]?\s*([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-]\s*[0-9]{2,4})/i,
  ];

  for (const reg of dueDateRegexes) {
    const m = reg.exec(clean);
    if (m && m[1]) {
      due_date = normalizeDateString(m[1]);
      if (due_date) break;
    }
  }

  // Detect Issue Date:
  const issueDateRegexes = [
    /(?:datum\s*izdavanja|datum\s*računa|datum\s*obracuna|datum\s*dokumenta|datum\s*ponude|issue\s*date)\s*[:=]?\s*([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-]\s*[0-9]{2,4})/i,
    /(?:datum\s*računa|datum\s*izdavanja)[\s\S]{1,80}?([0-9]{1,2}\s*[./-]\s*[0-9]{1,2}\s*[./-][0-9]{4})/i,
  ];

  for (const reg of issueDateRegexes) {
    const m = reg.exec(clean);
    if (m && m[1]) {
      issue_date = normalizeDateString(m[1]);
      if (issue_date) break;
    }
  }

  // Detect Provider & Type Hints
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
  } else if (
    lower.includes("hrvatski telekom") ||
    lower.includes("t-com") ||
    lower.includes("telekom")
  ) {
    provider_hint = "Hrvatski Telekom";
    type_hint = "internet";
  } else if (lower.includes("a1 hrvatska") || lower.includes("a1")) {
    provider_hint = "A1";
    type_hint = lower.includes("mobil") ? "mobile" : "internet";
  } else if (lower.includes("telemach")) {
    provider_hint = "Telemach";
    type_hint = "mobile";
  } else if (
    lower.includes("hep") ||
    lower.includes("elektra") ||
    lower.includes("struj") ||
    lower.includes("električ")
  ) {
    provider_hint = "HEP Elektra";
    type_hint = "electricity";
  } else if (
    lower.includes("plin") ||
    lower.includes("plinara") ||
    lower.includes("grijanj")
  ) {
    provider_hint = "Plinara";
    type_hint = "heating";
  } else if (
    lower.includes("vodovod") ||
    lower.includes("odvodnj") ||
    lower.includes("voda")
  ) {
    provider_hint = "Vodovod";
    type_hint = "water";
  } else if (
    lower.includes("čistoć") ||
    lower.includes("komunal") ||
    lower.includes("otpad")
  ) {
    provider_hint = "Komunalac";
    type_hint = "communal";
  }

  if (type_hint === "insurance") {
    if (lower.includes("dzo") || lower.includes("zdrav")) {
      title_hint = "Dopunsko zdravstveno osiguranje";
    } else if (
      lower.includes("kuć") ||
      lower.includes("dom") ||
      lower.includes("imovin")
    ) {
      title_hint = "Osiguranje kuće / imovine";
    } else if (lower.includes("auto") || lower.includes("kasko")) {
      title_hint = "Auto osiguranje";
    } else {
      title_hint = "Osiguranje";
    }
  }

  return { amount, due_date, issue_date, provider_hint, type_hint, title_hint };
}

function normalizeDateString(str: string): string | null {
  const cleaned = str.replace(/[.]+/g, ".").trim();
  const parts = cleaned.split(/[./-]/).filter(Boolean);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Handle 2-digit years
    if (year < 100) year += 2000;

    if (
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12 &&
      year >= 2000 &&
      year <= 2100
    ) {
      const dStr = String(day).padStart(2, "0");
      const mStr = String(month).padStart(2, "0");
      return `${year}-${mStr}-${dStr}`;
    }
  }
  return null;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const contentType = request.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let ext = "pdf";
    let originalName = "bill";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return error(400, "No file provided in form data");
      }
      originalName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      const parsedExt = path.extname(file.name).toLowerCase().replace(".", "");
      if (["pdf", "png", "jpg", "jpeg", "webp"].includes(parsedExt)) {
        ext = parsedExt === "jpeg" ? "jpg" : parsedExt;
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      if (!body?.file && !body?.image) {
        return error(400, 'Missing "file" or "image" in JSON payload');
      }
      const rawData = body.file || body.image;
      if (body.name) {
        originalName = body.name;
        const parsedExt = path
          .extname(body.name)
          .toLowerCase()
          .replace(".", "");
        if (["pdf", "png", "jpg", "jpeg", "webp"].includes(parsedExt)) {
          ext = parsedExt === "jpeg" ? "jpg" : parsedExt;
        }
      }

      const match = rawData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1].toLowerCase();
        if (mime.includes("pdf")) ext = "pdf";
        else if (mime.includes("png")) ext = "png";
        else if (mime.includes("webp")) ext = "webp";
        else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
        fileBuffer = Buffer.from(match[2], "base64");
      } else {
        fileBuffer = Buffer.from(rawData, "base64");
      }
    } else {
      return error(400, "Unsupported Content-Type");
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return error(400, "Uploaded file is empty");
    }

    // Save unique file to bills_files
    const timeTag = Date.now();
    const safeBase = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const savedFileName = `${timeTag}_${safeBase}.${ext}`;
    const targetPath = path.join(UPLOAD_DIR, savedFileName);

    await writeFile(targetPath, fileBuffer);

    // Perform automatic scan / text extraction
    let extracted: {
      amount: number | null;
      due_date: string | null;
      issue_date: string | null;
      provider_hint: string | null;
      type_hint: string | null;
      title_hint: string | null;
    } = {
      amount: null,
      due_date: null,
      issue_date: null,
      provider_hint: null,
      type_hint: null,
      title_hint: null,
    };

    if (ext === "pdf") {
      try {
        const text = extractTextFromPdf(fileBuffer);
        extracted = _parseBillInfoFromText(text);
      } catch (parseErr) {
        console.warn("PDF stream extraction error:", parseErr);
      }
    }

    const fileUrl = `/_api/bills/file?name=${encodeURIComponent(savedFileName)}`;

    return json({
      ok: true,
      file_url: fileUrl,
      file_name: savedFileName,
      original_name: originalName,
      file_type: ext === "pdf" ? "application/pdf" : `image/${ext}`,
      file_size: fileBuffer.length,
      extracted,
    });
  } catch (err: any) {
    console.error("Bill upload failed:", err);
    return error(500, err?.message || "Failed to upload bill");
  }
};
