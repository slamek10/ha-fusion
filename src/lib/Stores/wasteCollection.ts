import { writable, derived, get } from 'svelte/store';
import { base } from '$app/paths';

export interface WasteCategory {
	id: string;
	name: string;
	color: string;
	icon: string;
	dates: string[]; // YYYY-MM-DD
}

export interface WasteCollectionData {
	calendar_image?: string;
	has_calendar_image?: boolean;
	last_updated?: string;
	location?: string;
	year?: number;
	default_format?: string;
	today_text?: string;
	tomorrow_text?: string;
	categories: WasteCategory[];
}

export const wasteCollectionStore = writable<WasteCollectionData>({
	calendar_image: '/_api/waste_collection/image',
	has_calendar_image: false,
	location: 'Općina Vratišinec',
	year: 2026,
	categories: []
});

export const wasteCollectionLoaded = writable<boolean>(false);

export async function fetchWasteCollection(force = false) {
	if (get(wasteCollectionLoaded) && !force) return get(wasteCollectionStore);
	try {
		const res = await fetch(`${base}/_api/waste_collection`);
		if (res.ok) {
			const data = await res.json();
			wasteCollectionStore.set(data);
			wasteCollectionLoaded.set(true);
			return data;
		}
	} catch (err) {
		console.error('Failed to fetch waste collection data:', err);
	}
	return get(wasteCollectionStore);
}

export async function saveWasteCollection(data: WasteCollectionData) {
	try {
		const res = await fetch(`${base}/_api/waste_collection`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (res.ok) {
			const result = await res.json();
			wasteCollectionStore.set(result.data || data);
			return { ok: true };
		}
		const err = await res.text();
		return { ok: false, error: err };
	} catch (err: any) {
		return { ok: false, error: err?.message || 'Save failed' };
	}
}

/**
 * Proper Croatian declension for days:
 * 1 dan, 2-4 dana, 5-20 dana, 21 dan, 22-24 dana, 25-30 dana...
 */
export function formatCroatianDays(days: number): string {
	if (days === 0) return 'Danas';
	const mod10 = days % 10;
	const mod100 = days % 100;
	if (mod10 === 1 && mod100 !== 11) {
		return `Sljedeće za ${days} dan`;
	} else {
		return `Sljedeće za ${days} dana`;
	}
}

export function formatDateHR(isoStr: string): string {
	if (!isoStr) return '';
	const [y, m, d] = isoStr.split('-');
	if (!y || !m || !d) return isoStr;
	return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}.`;
}

export function formatCollectionCountdown(
	days: number,
	dateIsoStr?: string | null,
	options?: {
		format?: string;
		todayText?: string;
		tomorrowText?: string;
	}
): string {
	const todayText = options?.todayText?.trim() || 'Danas';
	const tomorrowText = options?.tomorrowText?.trim();
	const customFormat = options?.format?.trim();

	if (days === 0) {
		return todayText;
	}

	if (days === 1 && tomorrowText) {
		return tomorrowText;
	}

	const dateHr = dateIsoStr ? formatDateHR(dateIsoStr) : '';

	if (customFormat) {
		const mod10 = days % 10;
		const mod100 = days % 100;
		const danOrDana = mod10 === 1 && mod100 !== 11 ? 'dan' : 'dana';
		const dayOrDays = days === 1 ? 'day' : 'days';

		return customFormat
			.replace(/\{days\}/gi, String(days))
			.replace(/\{date\}/gi, dateHr)
			.replace(/\{dan_dana\}/gi, danOrDana)
			.replace(/\{day_days\}/gi, dayOrDays);
	}

	return formatCroatianDays(days);
}

export function getNextCollection(
	dates: string[] | undefined,
	referenceDate = new Date(),
	options?: {
		format?: string;
		todayText?: string;
		tomorrowText?: string;
	}
): {
	nextDate: string | null;
	daysUntil: number | null;
	formattedText: string;
	formattedDate: string | null;
	allUpcoming: string[];
} {
	if (!dates || dates.length === 0) {
		return {
			nextDate: null,
			daysUntil: null,
			formattedText: 'Nema zakazanih datuma',
			formattedDate: null,
			allUpcoming: []
		};
	}

	// Normalize today to start of day
	const today = new Date(
		referenceDate.getFullYear(),
		referenceDate.getMonth(),
		referenceDate.getDate()
	);

	const sorted = [...dates].sort();
	const upcoming = sorted.filter((dStr) => {
		const [y, m, d] = dStr.split('-').map(Number);
		const targetDate = new Date(y, m - 1, d);
		return targetDate.getTime() >= today.getTime();
	});

	if (upcoming.length === 0) {
		return {
			nextDate: null,
			daysUntil: null,
			formattedText: 'Nema više odvoza u ovoj godini',
			formattedDate: null,
			allUpcoming: []
		};
	}

	const nextDate = upcoming[0];
	const [y, m, d] = nextDate.split('-').map(Number);
	const targetDate = new Date(y, m - 1, d);

	const diffMs = targetDate.getTime() - today.getTime();
	const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

	return {
		nextDate,
		daysUntil,
		formattedText: formatCollectionCountdown(daysUntil, nextDate, options),
		formattedDate: formatDateHR(nextDate),
		allUpcoming: upcoming
	};
}
