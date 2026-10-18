import { writable, get } from "svelte/store";
import { base } from "$app/paths";

export interface SubBill {
  id: string;
  title: string;
  amount: number;
  paid: boolean;
  paid_date?: string | null;
  due_date?: string;
  notes?: string;
}

export interface BillType {
  id: string;
  name: string;
  icon: string;
  color: string;
  provider?: string;
  group?: string;
  expected_amount?: number;
  due_day?: number;
  notes?: string;
  sub_types?: string[];
  auto_pay?: boolean;
  fixed_amount?: boolean;
}

export interface BillEntry {
  id: string;
  type_id: string;
  title: string;
  provider?: string;
  amount: number;
  currency?: string;
  month: string; // YYYY-MM
  issue_date?: string; // YYYY-MM-DD
  due_date?: string; // YYYY-MM-DD
  paid: boolean;
  paid_date?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  notes?: string;
  created_at?: string;
  sub_bills?: SubBill[];
  auto_pay?: boolean;
  fixed_amount?: boolean;
}

export interface BillsSettings {
  currency: string;
  paycheck_day: number;
  bills_arrival_day: number;
  ai_provider?: "gemini" | "openai";
  ai_model?: string;
  ai_api_key?: string;
}

export interface BillsData {
  settings: BillsSettings;
  types: BillType[];
  bills: BillEntry[];
  dismissed_types?: Record<string, string[]>;
  last_updated?: string;
}

export const billsStore = writable<BillsData>({
  settings: {
    currency: "€",
    paycheck_day: 15,
    bills_arrival_day: 5,
    ai_provider: "gemini",
    ai_model: "gemini-2.5-flash",
    ai_api_key: "",
  },
  types: [],
  bills: [],
});

export const billsLoaded = writable<boolean>(false);

export async function fetchBills(force = false): Promise<BillsData> {
  if (get(billsLoaded) && !force) return get(billsStore);
  try {
    const res = await fetch(`${base}/_api/bills`);
    if (res.ok) {
      const data = await res.json();
      billsStore.set(data);
      billsLoaded.set(true);
      return data;
    }
  } catch (err) {
    console.error("Failed to fetch bills data:", err);
  }
  return get(billsStore);
}

export async function saveBills(
  data: BillsData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${base}/_api/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const result = await res.json();
      billsStore.set(result.data || data);
      return { ok: true };
    }
    const err = await res.text();
    return { ok: false, error: err };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Save failed" };
  }
}

export async function addBill(bill: Omit<BillEntry, "id"> & { id?: string }) {
  const current = get(billsStore);
  const newId =
    bill.id ||
    `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Compute total amount from sub_bills if provided
  let finalAmount = bill.amount;
  if (bill.sub_bills && bill.sub_bills.length > 0) {
    finalAmount = bill.sub_bills.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0,
    );
  }

  const newBill: BillEntry = {
    ...bill,
    id: newId,
    amount: Number(finalAmount) || 0,
    created_at: bill.created_at || new Date().toISOString(),
  };

  const dismissed = { ...(current.dismissed_types || {}) };
  if (newBill.type_id && newBill.month && dismissed[newBill.month]) {
    dismissed[newBill.month] = dismissed[newBill.month].filter(
      (id) => id !== newBill.type_id,
    );
  }

  const updated: BillsData = {
    ...current,
    bills: [newBill, ...current.bills],
    dismissed_types: dismissed,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function updateBill(id: string, updates: Partial<BillEntry>) {
  const current = get(billsStore);
  const updatedBills = current.bills.map((b) => {
    if (b.id === id) {
      const merged = { ...b, ...updates };
      if (merged.sub_bills && merged.sub_bills.length > 0) {
        merged.amount = merged.sub_bills.reduce(
          (sum, s) => sum + (Number(s.amount) || 0),
          0,
        );
        merged.paid = merged.sub_bills.every((s) => s.paid);
      }
      return merged;
    }
    return b;
  });
  const updated: BillsData = {
    ...current,
    bills: updatedBills,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function toggleBillPaid(id: string) {
  const current = get(billsStore);
  const todayStr = new Date().toISOString().split("T")[0];
  const updatedBills = current.bills.map((b) => {
    if (b.id === id) {
      const newPaid = !b.paid;
      const updatedSubBills = b.sub_bills
        ? b.sub_bills.map((s) => ({
            ...s,
            paid: newPaid,
            paid_date: newPaid ? todayStr : null,
          }))
        : undefined;

      return {
        ...b,
        paid: newPaid,
        paid_date: newPaid ? todayStr : null,
        sub_bills: updatedSubBills,
      };
    }
    return b;
  });
  const updated: BillsData = {
    ...current,
    bills: updatedBills,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function toggleSubBillPaid(billId: string, subBillId: string) {
  const current = get(billsStore);
  const todayStr = new Date().toISOString().split("T")[0];
  const updatedBills = current.bills.map((b) => {
    if (b.id === billId && b.sub_bills) {
      const updatedSubBills = b.sub_bills.map((s) => {
        if (s.id === subBillId) {
          const newPaid = !s.paid;
          return {
            ...s,
            paid: newPaid,
            paid_date: newPaid ? todayStr : null,
          };
        }
        return s;
      });
      const allPaid =
        updatedSubBills.length > 0 && updatedSubBills.every((s) => s.paid);
      return {
        ...b,
        paid: allPaid,
        paid_date: allPaid ? todayStr : null,
        sub_bills: updatedSubBills,
      };
    }
    return b;
  });
  const updated: BillsData = {
    ...current,
    bills: updatedBills,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function addSubBill(billId: string, subBill: Omit<SubBill, "id">) {
  const current = get(billsStore);
  const newSub: SubBill = {
    ...subBill,
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  const updatedBills = current.bills.map((b) => {
    if (b.id === billId) {
      const subBills = [...(b.sub_bills || []), newSub];
      const totalAmount = subBills.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0,
      );
      const allPaid = subBills.every((s) => s.paid);
      return {
        ...b,
        amount: totalAmount,
        paid: allPaid,
        sub_bills: subBills,
      };
    }
    return b;
  });
  const updated: BillsData = {
    ...current,
    bills: updatedBills,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function removeSubBill(billId: string, subBillId: string) {
  const current = get(billsStore);
  const updatedBills = current.bills.map((b) => {
    if (b.id === billId && b.sub_bills) {
      const subBills = b.sub_bills.filter((s) => s.id !== subBillId);
      const totalAmount = subBills.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0,
      );
      const allPaid = subBills.length > 0 && subBills.every((s) => s.paid);
      return {
        ...b,
        amount: totalAmount,
        paid: allPaid,
        sub_bills: subBills,
      };
    }
    return b;
  });
  const updated: BillsData = {
    ...current,
    bills: updatedBills,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function deleteBill(id: string) {
  const current = get(billsStore);
  const target = current.bills.find((b) => b.id === id);
  const dismissed = { ...(current.dismissed_types || {}) };

  if (target && target.type_id && target.month) {
    const list = dismissed[target.month] || [];
    if (!list.includes(target.type_id)) {
      dismissed[target.month] = [...list, target.type_id];
    }
  }

  const updated: BillsData = {
    ...current,
    bills: current.bills.filter((b) => b.id !== id),
    dismissed_types: dismissed,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export function createDefaultBill(
  type: BillType,
  month: string,
  currency = "€",
): BillEntry {
  const isFixed = Boolean(type.fixed_amount);
  const isAutoPay = Boolean(type.auto_pay);
  const defaultAmount =
    typeof type.expected_amount === "number" ? type.expected_amount : 0;

  const dueDay = type.due_day ? String(type.due_day).padStart(2, "0") : "20";
  const dueDate = `${month}-${dueDay}`;
  const todayStr = new Date().toISOString().split("T")[0];

  let subBills: SubBill[] | undefined = undefined;
  if (type.sub_types && type.sub_types.length > 0) {
    const perSubAmount =
      defaultAmount > 0
        ? Math.round((defaultAmount / type.sub_types.length) * 100) / 100
        : 0;
    subBills = type.sub_types.map((subName, index) => ({
      id: `sub_${type.id}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      title: subName,
      amount: perSubAmount,
      paid: isAutoPay,
      paid_date: isAutoPay ? todayStr : null,
      due_date: dueDate,
    }));
  }

  return {
    id: `bill_${type.id}_${month}_${Math.random().toString(36).substring(2, 6)}`,
    type_id: type.id,
    title: type.name,
    provider: type.provider || type.name,
    amount: defaultAmount,
    currency,
    month,
    due_date: dueDate,
    paid: isAutoPay,
    paid_date: isAutoPay ? todayStr : null,
    notes: type.notes || undefined,
    sub_bills: subBills,
    auto_pay: isAutoPay,
    fixed_amount: isFixed,
    created_at: new Date().toISOString(),
  };
}

export async function ensureDefaultBillsForMonth(
  month: string,
): Promise<boolean> {
  const current = get(billsStore);
  if (!current.types || current.types.length === 0) return false;

  const monthBills = current.bills.filter((b) => b.month === month);
  const existingTypeIds = new Set(monthBills.map((b) => b.type_id));
  const dismissed =
    (current.dismissed_types && current.dismissed_types[month]) || [];

  const missingTypes = current.types.filter(
    (t) => !existingTypeIds.has(t.id) && !dismissed.includes(t.id),
  );

  if (missingTypes.length === 0) return false;

  const newBills: BillEntry[] = missingTypes.map((t) =>
    createDefaultBill(t, month, current.settings?.currency || "€"),
  );

  const updated: BillsData = {
    ...current,
    bills: [...newBills, ...current.bills],
  };

  billsStore.set(updated);
  await saveBills(updated);
  return true;
}

export async function addBillType(type: BillType) {
  const current = get(billsStore);
  const currentMonth = getCurrentMonthStr();
  const defaultBill = createDefaultBill(
    type,
    currentMonth,
    current.settings?.currency || "€",
  );

  const updated: BillsData = {
    ...current,
    types: [...current.types, type],
    bills: [defaultBill, ...current.bills],
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function updateBillType(id: string, updates: Partial<BillType>) {
  const current = get(billsStore);
  const updatedTypes = current.types.map((t) =>
    t.id === id ? { ...t, ...updates } : t,
  );

  const targetType = updatedTypes.find((t) => t.id === id);
  const todayStr = new Date().toISOString().split("T")[0];
  const expectedAmt =
    typeof updates.expected_amount === "number"
      ? updates.expected_amount
      : targetType?.expected_amount;

  const updatedBills = current.bills.map((b) => {
    if (b.type_id === id) {
      const merged: BillEntry = { ...b };
      if (
        updates.name &&
        b.title === (current.types.find((t) => t.id === id)?.name || "")
      ) {
        merged.title = updates.name;
      }
      if (updates.provider !== undefined) {
        merged.provider = updates.provider;
      }
      if (updates.auto_pay !== undefined) {
        merged.auto_pay = updates.auto_pay;
        if (updates.auto_pay && !b.paid) {
          merged.paid = true;
          merged.paid_date = todayStr;
        }
      }
      if (updates.fixed_amount !== undefined) {
        merged.fixed_amount = updates.fixed_amount;
      }
      if (
        (updates.fixed_amount || targetType?.fixed_amount) &&
        typeof expectedAmt === "number" &&
        (!merged.sub_bills || merged.sub_bills.length === 0)
      ) {
        merged.amount = expectedAmt;
      }
      return merged;
    }
    return b;
  });

  // If fixed_amount is enabled, ensure a default bill exists for current month
  const currentMonth = getCurrentMonthStr();
  const hasCurrentMonthBill = updatedBills.some(
    (b) => b.type_id === id && b.month === currentMonth,
  );
  if (targetType?.fixed_amount && !hasCurrentMonthBill) {
    const defaultBill = createDefaultBill(
      targetType,
      currentMonth,
      current.settings?.currency || "€",
    );
    updatedBills.unshift(defaultBill);
  }

  const updated: BillsData = {
    ...current,
    types: updatedTypes,
    bills: updatedBills,
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export async function deleteBillType(id: string) {
  const current = get(billsStore);
  const updated: BillsData = {
    ...current,
    types: current.types.filter((t) => t.id !== id),
  };
  billsStore.set(updated);
  return await saveBills(updated);
}

export function formatCurrency(
  amount: number | null | undefined,
  symbol = "€",
): string {
  if (amount === null || amount === undefined || isNaN(amount))
    return `0.00 ${symbol}`;
  return `${amount.toFixed(2)} ${symbol}`;
}

export function formatDateHR(dateStr?: string | null): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}.`;
}

export function getCurrentMonthStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m) return monthStr;
  const date = new Date(y, m - 1, 1);
  const monthName = date.toLocaleDateString("hr-HR", {
    month: "long",
    year: "numeric",
  });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

export interface MonthStats {
  monthBills: BillEntry[];
  totalAmount: number;
  unpaidAmount: number;
  paidAmount: number;
  paidCount: number;
  unpaidCount: number;
  totalCount: number;
  percentPaid: number;
  paycheckStatus: {
    isAfterPaycheck: boolean;
    daysUntilPaycheck: number;
    text: string;
    state: "waiting" | "ready" | "upcoming";
  };
  byType: Array<{
    type: BillType;
    bills: BillEntry[];
    unpaid: number;
    paid: number;
    total: number;
    hasBill: boolean;
    allPaid: boolean;
  }>;
  byProvider: Array<{
    provider: string;
    bills: BillEntry[];
    unpaid: number;
    paid: number;
    total: number;
    allPaid: boolean;
  }>;
}

export function getMonthStats(
  bills: BillEntry[],
  month: string,
  types: BillType[],
  paycheckDay = 15,
  arrivalDay = 5,
  currency = "€",
  dismissedTypeIds: string[] = [],
): MonthStats {
  const existingMonthBills = bills.filter((b) => b.month === month);
  const existingTypeIds = new Set(existingMonthBills.map((b) => b.type_id));

  // Synthesize default bills for any bill type that does not have an explicit bill entry yet,
  // especially for those with fixed_amount (like Netflix, insurance, etc.)
  const virtualBills: BillEntry[] = [];
  for (const type of types) {
    if (!existingTypeIds.has(type.id) && !dismissedTypeIds.includes(type.id)) {
      if (type.fixed_amount) {
        virtualBills.push(createDefaultBill(type, month, currency));
      }
    }
  }

  const monthBills = [...existingMonthBills, ...virtualBills];

  let totalAmount = 0;
  let unpaidAmount = 0;
  let paidAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const bill of monthBills) {
    if (bill.sub_bills && bill.sub_bills.length > 0) {
      let billTotal = 0;
      let billUnpaid = 0;
      let billPaid = 0;
      let allSubPaid = true;

      for (const sub of bill.sub_bills) {
        const sAmt = typeof sub.amount === "number" ? sub.amount : 0;
        billTotal += sAmt;
        if (sub.paid) {
          billPaid += sAmt;
        } else {
          billUnpaid += sAmt;
          allSubPaid = false;
        }
      }

      totalAmount += billTotal;
      paidAmount += billPaid;
      unpaidAmount += billUnpaid;

      if (allSubPaid) {
        paidCount++;
      } else {
        unpaidCount++;
      }
    } else {
      const amt = typeof bill.amount === "number" ? bill.amount : 0;
      totalAmount += amt;
      if (bill.paid) {
        paidAmount += amt;
        paidCount++;
      } else {
        unpaidAmount += amt;
        unpaidCount++;
      }
    }
  }

  const totalCount = monthBills.length;
  const percentPaid =
    totalAmount > 0
      ? Math.round((paidAmount / totalAmount) * 100)
      : totalCount > 0 && unpaidCount === 0
        ? 100
        : 0;

  // Paycheck status calculation based on current date
  const now = new Date();
  const currentDay = now.getDate();
  const isCurrentMonth = month === getCurrentMonthStr();

  let isAfterPaycheck = currentDay >= paycheckDay;
  let daysUntilPaycheck = 0;
  let paycheckText = "";
  let paycheckState: "waiting" | "ready" | "upcoming" = "ready";

  if (isCurrentMonth) {
    if (currentDay < paycheckDay) {
      daysUntilPaycheck = paycheckDay - currentDay;
      paycheckState = "waiting";
      if (currentDay >= arrivalDay) {
        paycheckText = `Računi stižu oko ${arrivalDay}. u mjesecu. Čeka se plaća (${paycheckDay}.) za plaćanje — još ${daysUntilPaycheck} ${daysUntilPaycheck === 1 ? "dan" : daysUntilPaycheck < 5 ? "dana" : "dana"}.`;
      } else {
        paycheckText = `Očekivanje računa (oko ${arrivalDay}. u mjesecu) i plaće (${paycheckDay}.). Još ${daysUntilPaycheck} dana do plaće.`;
      }
    } else {
      paycheckState = "ready";
      paycheckText = `Plaća je sjela (${paycheckDay}. u mjesecu)! Vrijeme je za plaćanje prispjelih računa.`;
    }
  } else {
    // Past or future month view
    const [viewY, viewM] = month.split("-").map(Number);
    const viewDate = new Date(viewY, viewM - 1, 1);
    const nowDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (viewDate < nowDate) {
      paycheckState = "ready";
      paycheckText = `Arhiva računa za ${getMonthLabel(month)}.`;
    } else {
      paycheckState = "upcoming";
      paycheckText = `Nadolazeći mjesec: plaća ${paycheckDay}., računi stižu oko ${arrivalDay}.`;
    }
  }

  // Breakdown by BillType
  const byType = types.map((type) => {
    const typeBills = monthBills.filter((b) => b.type_id === type.id);
    let typeUnpaid = 0;
    let typePaid = 0;
    let typeTotal = 0;

    for (const b of typeBills) {
      if (b.sub_bills && b.sub_bills.length > 0) {
        for (const s of b.sub_bills) {
          const sa = typeof s.amount === "number" ? s.amount : 0;
          typeTotal += sa;
          if (s.paid) {
            typePaid += sa;
          } else {
            typeUnpaid += sa;
          }
        }
      } else {
        const a = typeof b.amount === "number" ? b.amount : 0;
        typeTotal += a;
        if (b.paid) {
          typePaid += a;
        } else {
          typeUnpaid += a;
        }
      }
    }

    const isFixed = Boolean(type.fixed_amount);
    const expected =
      typeof type.expected_amount === "number" ? type.expected_amount : 0;
    const hasAnyBill = typeBills.length > 0;

    return {
      type,
      bills: typeBills,
      unpaid: hasAnyBill
        ? typeUnpaid
        : isFixed
          ? type.auto_pay
            ? 0
            : expected
          : 0,
      paid: hasAnyBill
        ? typePaid
        : isFixed
          ? type.auto_pay
            ? expected
            : 0
          : 0,
      total: typeTotal > 0 ? typeTotal : isFixed ? expected : 0,
      hasBill: hasAnyBill || isFixed,
      allPaid:
        typeBills.length > 0
          ? typeBills.every((b) => b.paid)
          : Boolean(type.auto_pay),
    };
  });

  // Grouping by Provider
  const providerMap = new Map<
    string,
    { bills: BillEntry[]; unpaid: number; paid: number; total: number }
  >();

  for (const b of monthBills) {
    const matchedType = types.find((t) => t.id === b.type_id);
    const providerName =
      b.provider || matchedType?.provider || matchedType?.name || "Ostalo";

    if (!providerMap.has(providerName)) {
      providerMap.set(providerName, {
        bills: [],
        unpaid: 0,
        paid: 0,
        total: 0,
      });
    }
    const group = providerMap.get(providerName)!;
    group.bills.push(b);

    if (b.sub_bills && b.sub_bills.length > 0) {
      for (const s of b.sub_bills) {
        const sa = typeof s.amount === "number" ? s.amount : 0;
        group.total += sa;
        if (s.paid) group.paid += sa;
        else group.unpaid += sa;
      }
    } else {
      const a = typeof b.amount === "number" ? b.amount : 0;
      group.total += a;
      if (b.paid) group.paid += a;
      else group.unpaid += a;
    }
  }

  const byProvider = Array.from(providerMap.entries()).map(
    ([provider, data]) => ({
      provider,
      bills: data.bills,
      unpaid: data.unpaid,
      paid: data.paid,
      total: data.total,
      allPaid: data.bills.length > 0 && data.unpaid === 0,
    }),
  );

  return {
    monthBills,
    totalAmount,
    unpaidAmount,
    paidAmount,
    paidCount,
    unpaidCount,
    totalCount,
    percentPaid,
    paycheckStatus: {
      isAfterPaycheck,
      daysUntilPaycheck,
      text: paycheckText,
      state: paycheckState,
    },
    byType,
    byProvider,
  };
}
