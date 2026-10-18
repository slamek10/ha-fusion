import { readFile, writeFile, mkdir } from "fs/promises";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { existsSync } from "fs";

const DATA_FILE = "./data/bills.json";

const now = new Date();
const currentYear = now.getFullYear();
const currentMonthNum = String(now.getMonth() + 1).padStart(2, "0");
const currentMonthStr = `${currentYear}-${currentMonthNum}`;

const DEFAULT_DATA = {
  settings: {
    currency: "€",
    paycheck_day: 15,
    bills_arrival_day: 5,
    ai_provider: "gemini",
    ai_model: "gemini-2.5-flash",
    ai_api_key: "",
  },
  types: [
    {
      id: "internet",
      name: "Internet",
      icon: "mdi:wifi",
      color: "#2196F3",
      provider: "A1 / HT",
      expected_amount: 32.0,
      due_day: 20,
      notes: "Optički internet / fiksna linija",
    },
    {
      id: "electricity",
      name: "Struja (HEP)",
      icon: "mdi:lightning-bolt",
      color: "#FFB300",
      provider: "HEP Elektra",
      expected_amount: 65.0,
      due_day: 20,
      notes: "Električna energija",
    },
    {
      id: "mobile",
      name: "Mobitel",
      icon: "mdi:cellphone",
      color: "#AB47BC",
      provider: "Mobilni operater",
      expected_amount: 28.5,
      due_day: 18,
      notes: "Mobilna pretplata",
    },
    {
      id: "water",
      name: "Voda",
      icon: "mdi:water",
      color: "#26C6DA",
      provider: "Vodovod",
      expected_amount: 22.0,
      due_day: 22,
      notes: "Voda i odvodnja",
    },
    {
      id: "heating",
      name: "Plin / Grijanje",
      icon: "mdi:fire",
      color: "#FF7043",
      provider: "Plinara",
      expected_amount: 45.0,
      due_day: 20,
      notes: "Grijanje i topla voda",
    },
    {
      id: "communal",
      name: "Komunalno i otpad",
      icon: "mdi:home-city",
      color: "#66BB6A",
      provider: "Komunalac / Čistoća",
      expected_amount: 18.0,
      due_day: 25,
      notes: "Komunalna naknada i odvoz otpada",
    },
    {
      id: "insurance",
      name: "Osiguranje",
      icon: "mdi:shield-check",
      color: "#00897B",
      provider: "Uniqa Osiguranje",
      expected_amount: 85.0,
      due_day: 15,
      notes: "Godišnja/mjesečna osiguranja (kuća, vanjsko, zdravstveno)",
      fixed_amount: true,
      sub_types: [
        "Osiguranje kuće",
        "Vanjsko osiguranje",
        "Dopunsko zdravstveno",
      ],
    },
    {
      id: "netflix",
      name: "Netflix",
      icon: "mdi:television-classic",
      color: "#E50914",
      provider: "Netflix",
      expected_amount: 9.99,
      due_day: 15,
      notes: "Mjesečna pretplata",
      fixed_amount: true,
      auto_pay: true,
    },
  ],
  bills: [
    {
      id: `bill_${Date.now() - 300000}`,
      type_id: "internet",
      title: "Internet - Listopad",
      amount: 32.0,
      currency: "€",
      month: currentMonthStr,
      issue_date: `${currentMonthStr}-05`,
      due_date: `${currentMonthStr}-20`,
      paid: false,
      paid_date: null,
      file_url: null,
      file_name: null,
      file_type: null,
      notes: "Stigao na email 5. u mjesecu. Platiti nakon plaće (15.).",
      created_at: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: `bill_${Date.now() - 200000}`,
      type_id: "mobile",
      title: "Mobitel pretplata",
      amount: 28.5,
      currency: "€",
      month: currentMonthStr,
      issue_date: `${currentMonthStr}-06`,
      due_date: `${currentMonthStr}-18`,
      paid: false,
      paid_date: null,
      file_url: null,
      file_name: null,
      file_type: null,
      notes: "Email račun",
      created_at: new Date(Date.now() - 200000).toISOString(),
    },
    {
      id: `bill_${Date.now() - 100000}`,
      type_id: "electricity",
      title: "HEP Struja",
      amount: 64.8,
      currency: "€",
      month: currentMonthStr,
      issue_date: `${currentMonthStr}-04`,
      due_date: `${currentMonthStr}-20`,
      paid: true,
      paid_date: `${currentMonthStr}-16`,
      file_url: null,
      file_name: null,
      file_type: null,
      notes: "Plaćeno internet bankarstvom nakon plaće",
      created_at: new Date(Date.now() - 100000).toISOString(),
    },
    {
      id: `bill_${Date.now() - 50000}`,
      type_id: "insurance",
      title: "Uniqa Osiguranja",
      provider: "Uniqa Osiguranje",
      amount: 85.0,
      currency: "€",
      month: currentMonthStr,
      issue_date: `${currentMonthStr}-03`,
      due_date: `${currentMonthStr}-15`,
      paid: false,
      paid_date: null,
      file_url: null,
      file_name: null,
      file_type: null,
      notes: "Paket osiguranja za kućanstvo",
      created_at: new Date(Date.now() - 50000).toISOString(),
      sub_bills: [
        {
          id: "sub_1",
          title: "Osiguranje kuće",
          amount: 40.0,
          paid: false,
        },
        {
          id: "sub_2",
          title: "Vanjsko osiguranje",
          amount: 25.0,
          paid: false,
        },
        {
          id: "sub_3",
          title: "Dopunsko zdravstveno",
          amount: 20.0,
          paid: true,
          paid_date: `${currentMonthStr}-10`,
        },
      ],
    },
  ],
  last_updated: new Date().toISOString(),
};

export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });

  try {
    if (!existsSync("./data")) {
      await mkdir("./data", { recursive: true });
    }

    if (!existsSync(DATA_FILE)) {
      await writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), "utf8");
      return json(DEFAULT_DATA);
    }

    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return json(parsed);
  } catch (err: any) {
    return error(500, err?.message || "Failed to read bills data");
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object") {
      return error(400, "Invalid JSON body");
    }

    if (!existsSync("./data")) {
      await mkdir("./data", { recursive: true });
    }

    payload.last_updated = new Date().toISOString();
    await writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
    return json({ ok: true, data: payload });
  } catch (err: any) {
    return error(500, err?.message || "Failed to save bills data");
  }
};
