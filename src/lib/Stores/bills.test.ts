import { describe, it, expect } from "vitest";
import {
  getMonthStats,
  formatCurrency,
  type BillEntry,
  type BillType,
} from "./bills";

describe("Bills calculations and statistics", () => {
  const mockTypes: BillType[] = [
    {
      id: "internet",
      name: "Internet",
      icon: "mdi:wifi",
      color: "#2196F3",
      expected_amount: 30,
    },
    {
      id: "electricity",
      name: "Struja",
      icon: "mdi:lightning-bolt",
      color: "#FFB300",
      expected_amount: 60,
    },
    {
      id: "mobile",
      name: "Mobitel",
      icon: "mdi:cellphone",
      color: "#AB47BC",
      expected_amount: 25,
    },
  ];

  const mockBills: BillEntry[] = [
    {
      id: "b1",
      type_id: "internet",
      title: "A1 Internet",
      amount: 32.5,
      month: "2026-10",
      paid: false,
      due_date: "2026-10-20",
    },
    {
      id: "b2",
      type_id: "mobile",
      title: "Telemach Mobitel",
      amount: 25.0,
      month: "2026-10",
      paid: false,
      due_date: "2026-10-18",
    },
    {
      id: "b3",
      type_id: "electricity",
      title: "HEP Elektra",
      amount: 65.0,
      month: "2026-10",
      paid: true,
      paid_date: "2026-10-16",
      due_date: "2026-10-18",
    },
    {
      id: "b4",
      type_id: "internet",
      title: "Rujan Internet",
      amount: 30.0,
      month: "2026-09",
      paid: true,
    },
  ];

  it("correctly filters and calculates stats for selected month", () => {
    const stats = getMonthStats(mockBills, "2026-10", mockTypes, 15, 5);

    expect(stats.totalCount).toBe(3);
    expect(stats.unpaidCount).toBe(2);
    expect(stats.paidCount).toBe(1);

    // Amounts: 32.5 + 25 = 57.5 unpaid; 65 paid; total = 122.5
    expect(stats.unpaidAmount).toBeCloseTo(57.5);
    expect(stats.paidAmount).toBeCloseTo(65.0);
    expect(stats.totalAmount).toBeCloseTo(122.5);

    // % paid: 65 / 122.5 = 53%
    expect(stats.percentPaid).toBe(53);
  });

  it("formats currencies correctly", () => {
    expect(formatCurrency(35.5, "€")).toBe("35.50 €");
    expect(formatCurrency(0, "€")).toBe("0.00 €");
    expect(formatCurrency(null, "€")).toBe("0.00 €");
  });

  it("correctly groups breakdown by bill type", () => {
    const stats = getMonthStats(mockBills, "2026-10", mockTypes, 15, 5);
    expect(stats.byType.length).toBe(3);

    const internet = stats.byType.find((t) => t.type.id === "internet");
    expect(internet).toBeDefined();
    expect(internet?.hasBill).toBe(true);
    expect(internet?.unpaid).toBe(32.5);
    expect(internet?.allPaid).toBe(false);

    const elec = stats.byType.find((t) => t.type.id === "electricity");
    expect(elec?.hasBill).toBe(true);
    expect(elec?.unpaid).toBe(0);
    expect(elec?.paid).toBe(65.0);
    expect(elec?.allPaid).toBe(true);
  });

  it("correctly determines paycheck status", () => {
    const stats = getMonthStats(mockBills, "2026-10", mockTypes, 15, 5);
    expect(stats.paycheckStatus).toBeDefined();
    expect(typeof stats.paycheckStatus.isAfterPaycheck).toBe("boolean");
    expect(typeof stats.paycheckStatus.text).toBe("string");
  });

  it("correctly calculates totals with itemized sub-bills (e.g. Uniqa Osiguranje)", () => {
    const insuranceType: BillType = {
      id: "insurance",
      name: "Osiguranje",
      icon: "mdi:shield-check",
      color: "#00897B",
      provider: "Uniqa Osiguranje",
      sub_types: [
        "Osiguranje kuće",
        "Vanjsko osiguranje",
        "Dopunsko zdravstveno",
      ],
    };

    const uniqaBill: BillEntry = {
      id: "b_uniqa",
      type_id: "insurance",
      title: "Uniqa Osiguranja",
      provider: "Uniqa Osiguranje",
      amount: 85.0,
      month: "2026-10",
      paid: false,
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
          paid_date: "2026-10-10",
        },
      ],
    };

    const billsWithSub = [uniqaBill];
    const stats = getMonthStats(
      billsWithSub,
      "2026-10",
      [insuranceType],
      15,
      5,
    );

    // Total = 40 + 25 + 20 = 85
    expect(stats.totalAmount).toBe(85.0);
    // Unpaid = 40 + 25 = 65
    expect(stats.unpaidAmount).toBe(65.0);
    // Paid = 20
    expect(stats.paidAmount).toBe(20.0);
    // All paid should be false since only 1 of 3 sub-bills is paid
    expect(stats.paidCount).toBe(0);
    expect(stats.unpaidCount).toBe(1);

    // Grouping by provider
    expect(stats.byProvider.length).toBe(1);
    const uniqaGroup = stats.byProvider.find(
      (p) => p.provider === "Uniqa Osiguranje",
    );
    expect(uniqaGroup).toBeDefined();
    expect(uniqaGroup?.total).toBe(85.0);
    expect(uniqaGroup?.unpaid).toBe(65.0);
    expect(uniqaGroup?.paid).toBe(20.0);
    expect(uniqaGroup?.allPaid).toBe(false);
  });

  it("creates default bills with fixed amount and automatic payment", async () => {
    const { createDefaultBill } = await import("./bills");

    const netflixType: BillType = {
      id: "netflix",
      name: "Netflix",
      icon: "mdi:television-classic",
      color: "#E50914",
      provider: "Netflix",
      expected_amount: 9.99,
      due_day: 15,
      auto_pay: true,
      fixed_amount: true,
    };

    const netflixBill = createDefaultBill(netflixType, "2026-10", "€");
    expect(netflixBill.title).toBe("Netflix");
    expect(netflixBill.amount).toBe(9.99);
    expect(netflixBill.paid).toBe(true);
    expect(netflixBill.paid_date).toBeDefined();
    expect(netflixBill.due_date).toBe("2026-10-15");
    expect(netflixBill.auto_pay).toBe(true);
    expect(netflixBill.fixed_amount).toBe(true);

    const electricityType: BillType = {
      id: "hep",
      name: "Struja",
      icon: "mdi:lightning-bolt",
      color: "#FFB300",
      provider: "HEP",
      expected_amount: 55.0,
      due_day: 20,
      auto_pay: false,
      fixed_amount: false,
    };

    const hepBill = createDefaultBill(electricityType, "2026-10", "€");
    expect(hepBill.title).toBe("Struja");
    expect(hepBill.amount).toBe(55.0);
    expect(hepBill.paid).toBe(false);
    expect(hepBill.paid_date).toBeNull();
    expect(hepBill.due_date).toBe("2026-10-20");
    expect(hepBill.auto_pay).toBe(false);
    expect(hepBill.fixed_amount).toBe(false);
  });

  it("automatically prefills fixed amount in getMonthStats without requiring manual bill entry", () => {
    const netflixType: BillType = {
      id: "netflix",
      name: "Netflix",
      icon: "mdi:television-classic",
      color: "#E50914",
      provider: "Netflix",
      expected_amount: 9.99,
      due_day: 15,
      auto_pay: true,
      fixed_amount: true,
    };

    const emptyBills: BillEntry[] = [];
    const stats = getMonthStats(
      emptyBills,
      "2026-10",
      [netflixType],
      15,
      5,
      "€",
    );

    // Netflix is prefilled with hasBill: true, 9.99, and paid
    expect(stats.byType.length).toBe(1);
    const netflixStat = stats.byType[0];
    expect(netflixStat.hasBill).toBe(true);
    expect(netflixStat.total).toBe(9.99);
    expect(netflixStat.paid).toBe(9.99);
    expect(netflixStat.unpaid).toBe(0);

    // Also synthesized in monthBills for immediate display
    expect(stats.monthBills.length).toBe(1);
    expect(stats.monthBills[0].amount).toBe(9.99);
    expect(stats.monthBills[0].paid).toBe(true);
  });
});

describe("Bill OCR and Regex Parser", () => {
  it("correctly extracts amount 7.99 from Croatian insurance bill without matching policy numbers", async () => {
    const { _parseBillInfoFromText: parseBillInfoFromText } =
      await import("../../routes/_api/bills/upload/+server");

    const ocrSample = `
Od: UNIQA osiguranje d.d.
Telefon/Fax: (01) 6324 200/250
Datum računa: 20.09.2026.
Datum dospijeća: 15.10.2026.
Račun broj: 26598794-01-0101
R.Br. Polica broj Vrsta usluge KPD Trajanje osiguranja Rata Za uplatu (EUR)
 1. 0204215101-02 Zdrav. os. 65.12.12 15.06.2026-15.06.2027 5 7,99
Ukupno (EUR): 7,99
Za uplatu (EUR): 7,99
Opis usluge: 1. Premija, DZO SLAMEK IVAN
EUR =7,99
Premija EUR: 7,99
`;

    const parsed = parseBillInfoFromText(ocrSample);
    expect(parsed.amount).toBe(7.99);
    expect(parsed.due_date).toBe("2026-10-15");
    expect(parsed.issue_date).toBe("2026-09-20");
    expect(parsed.provider_hint).toBe("Uniqa Osiguranje");
    expect(parsed.type_hint).toBe("insurance");
  });
});
