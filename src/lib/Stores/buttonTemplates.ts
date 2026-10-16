import { writable, get } from 'svelte/store';
import { configuration } from '$lib/Stores';

export interface TemplateSummary {
	file: string;
	name: string;
	keys: string[];
}

export interface ButtonTemplatesState {
	loaded: boolean;
	dir: string;
	templates: TemplateSummary[];
	definitions: Record<string, any>;
}

export const buttonTemplateStore = writable<ButtonTemplatesState>({
	loaded: false,
	dir: '',
	templates: [],
	definitions: {}
});

let isFetching = false;

export async function fetchButtonTemplates(customDir?: string): Promise<ButtonTemplatesState> {
	if (isFetching) return get(buttonTemplateStore);
	isFetching = true;

	const conf = get(configuration);
	const targetDir = customDir || conf?.template_dir;
	const url = `/_api/button_templates${targetDir ? `?dir=${encodeURIComponent(targetDir)}` : ''}`;

	try {
		const res = await fetch(url);
		if (res.ok) {
			const data = await res.json();
			const state: ButtonTemplatesState = {
				loaded: true,
				dir: data.dir || '',
				templates: Array.isArray(data.templates) ? data.templates : [],
				definitions: data.definitions || {}
			};
			buttonTemplateStore.set(state);
			return state;
		}
	} catch (err) {
		console.warn('Failed to fetch button templates:', err);
	} finally {
		isFetching = false;
	}

	return get(buttonTemplateStore);
}

/**
 * Resolves full template hierarchy taking nested `template:` definitions into account.
 */
export function resolveTemplateHierarchy(
	templates: string | string[] | undefined,
	definitions: Record<string, any>
): string[] {
	if (!templates) return [];
	const list = Array.isArray(templates) ? templates : [templates];
	const visited = new Set<string>();
	const result: string[] = [];

	function visit(name: string) {
		if (!name || visited.has(name)) return;
		visited.add(name);
		result.push(name);

		const def = definitions[name];
		if (def?.template) {
			const sub = Array.isArray(def.template) ? def.template : [def.template];
			for (const s of sub) {
				visit(s);
			}
		}
	}

	for (const t of list) {
		if (typeof t === 'string' && t.trim()) {
			visit(t.trim());
		}
	}
	return result;
}

/**
 * Checks whether circle brightness percentage ring should be active for these templates.
 */
export function hasCircleInTemplates(
	resolvedKeys: string[],
	explicitShowCircle?: boolean
): boolean {
	if (explicitShowCircle) return true;
	return resolvedKeys.includes('circle') || resolvedKeys.includes('light');
}

/**
 * Evaluates any button-card JS block [[[ ... ]]]
 */
export function evaluateButtonCardJs(
	codeOrStr: string | undefined,
	context: { entity?: any; state?: string; stateOn?: boolean; states?: any }
): string | null {
	if (!codeOrStr || typeof codeOrStr !== 'string') return null;
	const trimmed = codeOrStr.trim();
	if (!trimmed.includes('[[[')) {
		return trimmed;
	}
	const match = trimmed.match(/\[\[\[([\s\S]*?)\]\]\]/);
	if (!match) return trimmed;
	const jsBody = match[1];

	const variables = {
		state: context.state || (context.stateOn ? 'on' : 'off'),
		state_on: Boolean(context.stateOn),
		timeout: 0,
		translate_unknown: 'Unknown'
	};

	try {
		const fn = new Function('variables', 'entity', 'states', jsBody);
		const result = fn(variables, context.entity, context.states);
		if (result !== undefined && result !== null) {
			return String(result);
		}
	} catch (err) {
		// Suppress runtime eval error in UI
	}
	return null;
}

/**
 * Extracts and evaluates custom SVG icon from a template's custom_fields.icon
 */
export function evaluateButtonCardIcon(
	rawIcon: string | undefined,
	context: { entity?: any; state?: string; stateOn?: boolean; states?: any }
): string | null {
	if (!rawIcon || typeof rawIcon !== 'string') return null;
	const trimmed = rawIcon.trim();
	if (trimmed.startsWith('<svg') && !trimmed.includes('[[[')) {
		return trimmed;
	}

	// Try evaluation
	const evaluated = evaluateButtonCardJs(rawIcon, context);
	if (evaluated && evaluated.includes('<svg')) {
		return evaluated;
	}

	// Regex fallback
	const svgMatch = trimmed.match(/<svg[\s\S]*?<\/svg>/);
	if (svgMatch) {
		let svg = svgMatch[0];
		svg = svg.replace(/\$\{state\}/g, context.stateOn ? 'on' : 'off');
		return svg;
	}
	return null;
}

/**
 * Scopes internal <style> blocks and @keyframes within an SVG to avoid global style leakage.
 */
export function sanitizeAndScopeSvg(svg: string, templateKey: string): string {
	if (!svg || typeof svg !== 'string') return svg;
	const scopeId = 'svg-tpl-' + templateKey;

	let modifiedSvg = svg;
	if (/<svg\b[^>]*class=\"/i.test(modifiedSvg)) {
		modifiedSvg = modifiedSvg.replace(/(<svg\b[^>]*class=\")([^\"]*)(\")/i, (_, p1, p2, p3) => {
			return p1 + p2 + ' ' + scopeId + p3;
		});
	} else {
		modifiedSvg = modifiedSvg.replace(/<svg\b/i, '<svg class="' + scopeId + '" ');
	}

	modifiedSvg = modifiedSvg.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_: string, cssContent: string) => {
		let scopedCss = cssContent;

		const kfMap: Record<string, string> = {};
		scopedCss = scopedCss.replace(/@keyframes\s+([a-zA-Z0-9_-]+)/g, (_: string, name: string) => {
			const newName = 'kf_' + templateKey + '_' + name;
			kfMap[name] = newName;
			return '@keyframes ' + newName;
		});

		for (const [oldName, newName] of Object.entries(kfMap)) {
			const reg = new RegExp(
				'(\\banimation(?:-name)?\\s*:\\s*)([^;}]*\\b)?' + oldName + '(\\b)',
				'g'
			);
			scopedCss = scopedCss.replace(reg, (_: string, p1: string, p2: string, p3: string) => {
				return p1 + (p2 || '') + newName + p3;
			});
		}

		scopedCss = scopedCss.replace(/transform-origin\s*:\s*([^;}]+)/g, (_: string, val: string) => {
			return 'transform-origin: ' + val + '; transform-box: fill-box';
		});

		const parts: { type: 'rules' | 'kf'; text: string }[] = [];
		let pos = 0;
		const kfBlockRegex = /@keyframes\s+[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g;
		let m: RegExpExecArray | null;
		while ((m = kfBlockRegex.exec(scopedCss)) !== null) {
			if (m.index > pos) {
				parts.push({ type: 'rules', text: scopedCss.slice(pos, m.index) });
			}
			parts.push({ type: 'kf', text: m[0] });
			pos = m.index + m[0].length;
		}
		if (pos < scopedCss.length) {
			parts.push({ type: 'rules', text: scopedCss.slice(pos) });
		}

		const resultCss = parts
			.map((p) => {
				if (p.type === 'kf') return p.text;
				return p.text.replace(/([^{}]+)\{/g, (ruleMatch: string, selector: string) => {
					const trimmed = selector.trim();
					if (!trimmed || trimmed.startsWith('@')) return ruleMatch;
					const scoped = selector
						.split(',')
						.map((s: string) => {
							const st = s.trim();
							if (!st) return st;
							return '.' + scopeId + ' ' + st;
						})
						.join(', ');
					return scoped + ' {';
				});
			})
			.join('\n');

		return '<style>' + resultCss + '</style>';
	});

	return modifiedSvg;
}

/**
 * Converts template style definition array/object to inline CSS style string.
 */
export function stylesToCss(styles: any): string {
	if (!styles) return '';
	if (typeof styles === 'string') return styles;
	if (Array.isArray(styles)) {
		return styles
			.map((item) => {
				if (typeof item === 'string') {
					return item.trim().endsWith(';') ? item.trim() : `${item.trim()};`;
				}
				if (typeof item === 'object' && item !== null) {
					return Object.entries(item)
						.map(([k, v]) => `${k}: ${v};`)
						.join(' ');
				}
				return '';
			})
			.filter(Boolean)
			.join(' ');
	}
	if (typeof styles === 'object') {
		return Object.entries(styles)
			.map(([k, v]) => `${k}: ${v};`)
			.join(' ');
	}
	return '';
}

export type ItemShape = 'default' | 'medium' | 'square';

/**
 * Determines the shape/size of a given dashboard item.
 */
export function getItemShape(item: any, definitions: Record<string, any> = {}): ItemShape {
	if (!item) return 'default';
	if (item.shape === 'square') return 'square';
	if (item.shape === 'medium') return 'medium';
	if (item.shape === 'default') return 'default';
	if (item.button_template === 'base') return 'square';
	if (Array.isArray(item.button_templates) && item.button_templates.includes('base')) return 'square';

	const list: string[] = [];
	if (Array.isArray(item.button_templates)) list.push(...item.button_templates);
	if (item.button_template && !list.includes(item.button_template)) list.push(item.button_template);

	if (list.length > 0 && definitions && Object.keys(definitions).length > 0) {
		const resolved = resolveTemplateHierarchy(list, definitions);
		if (resolved.includes('base')) return 'square';
	}
	return 'default';
}

/**
 * Determines whether a given dashboard item is rendered as square (3/3 height).
 */
export function isItemSquare(item: any, definitions: Record<string, any> = {}): boolean {
	return getItemShape(item, definitions) === 'square';
}

/**
 * Determines whether a given dashboard item is rendered as medium (2/3 height).
 */
export function isItemMedium(item: any, definitions: Record<string, any> = {}): boolean {
	return getItemShape(item, definitions) === 'medium';
}

/**
 * Finds and evaluates the first custom icon among the resolved template keys.
 */
export function getCustomIconFromTemplates(
	resolvedKeys: string[],
	definitions: Record<string, any>,
	context: { entity?: any; state?: string; stateOn?: boolean; states?: any }
): { svg: string; styles?: Record<string, any>; templateKey?: string } | null {
	for (const key of resolvedKeys) {
		const def = definitions[key];
		if (def?.custom_fields?.icon) {
			const rawSvg = evaluateButtonCardIcon(def.custom_fields.icon, context);
			if (rawSvg) {
				const svg = sanitizeAndScopeSvg(rawSvg, key);
				const iconStyles = def?.styles?.custom_fields?.icon;
				return { svg, styles: iconStyles, templateKey: key };
			}
		}
	}
	return null;
}

export interface GridPosition {
	col: number;
	row: number;
	rowSpan: number;
}

/**
 * Calculates exact CSS grid column and row positions for items in a section.
 * Supports:
 * - Square (3 rows, full height)
 * - Medium (2 rows, 2/3 height)
 * - Default/Standard (1 row, 1/3 height)
 */
export function computeGridPositions(
	items: any[] | undefined,
	definitions: Record<string, any> = {}
): Map<any, GridPosition> {
	if (!Array.isArray(items) || items.length === 0) return new Map();

	const hasCustomLayout = items.some(
		(item) => getItemShape(item, definitions) !== 'default' || (item && typeof item.col === 'number')
	);

	if (!hasCustomLayout) {
		return new Map();
	}

	const colOccupancy: Record<number, boolean[]> = {};

	function getColSlots(c: number): boolean[] {
		if (!colOccupancy[c]) colOccupancy[c] = [false, false, false];
		return colOccupancy[c];
	}

	function findFreeColForSquare(preferredCol?: number): number {
		if (preferredCol) {
			const s = getColSlots(preferredCol);
			if (!s[0] && !s[1] && !s[2]) return preferredCol;
		}
		let c = 1;
		while (true) {
			const s = getColSlots(c);
			if (!s[0] && !s[1] && !s[2]) return c;
			c++;
		}
	}

	function findFreeSlotForMedium(preferredCol?: number): { col: number; row: number } {
		if (preferredCol) {
			const s = getColSlots(preferredCol);
			if (!s[0] && !s[1]) return { col: preferredCol, row: 1 };
			if (!s[1] && !s[2]) return { col: preferredCol, row: 2 };
			for (let r = 0; r < s.length - 1; r++) {
				if (!s[r] && !s[r + 1]) return { col: preferredCol, row: r + 1 };
			}
			const nextRow = s.length + 1;
			return { col: preferredCol, row: nextRow };
		}
		let c = 1;
		while (true) {
			const s = getColSlots(c);
			if (!s[0] && !s[1]) return { col: c, row: 1 };
			if (!s[1] && !s[2]) return { col: c, row: 2 };
			c++;
		}
	}

	function findFreeSlotForHorizontal(preferredCol?: number): { col: number; row: number } {
		if (preferredCol) {
			const s = getColSlots(preferredCol);
			for (let r = 0; r < s.length; r++) {
				if (!s[r]) return { col: preferredCol, row: r + 1 };
			}
			const nextRow = s.length + 1;
			return { col: preferredCol, row: nextRow };
		}
		let c = 1;
		while (true) {
			const s = getColSlots(c);
			for (let r = 0; r < 3; r++) {
				if (!s[r]) return { col: c, row: r + 1 };
			}
			c++;
		}
	}

	const map = new Map<any, GridPosition>();

	for (const item of items) {
		if (!item) continue;
		const shape = getItemShape(item, definitions);
		if (shape === 'square') {
			const col = findFreeColForSquare(item.col);
			const s = getColSlots(col);
			s[0] = s[1] = s[2] = true;
			const pos = { col, row: 1, rowSpan: 3 };
			map.set(item.id, pos);
			if (item.id !== undefined && item.id !== null) {
				map.set(String(item.id), pos);
			}
		} else if (shape === 'medium') {
			const slot = findFreeSlotForMedium(item.col);
			const s = getColSlots(slot.col);
			while (s.length < slot.row + 1) s.push(false);
			s[slot.row - 1] = true;
			s[slot.row] = true;
			const pos = { col: slot.col, row: slot.row, rowSpan: 2 };
			map.set(item.id, pos);
			if (item.id !== undefined && item.id !== null) {
				map.set(String(item.id), pos);
			}
		} else {
			const slot = findFreeSlotForHorizontal(item.col);
			const s = getColSlots(slot.col);
			while (s.length < slot.row) s.push(false);
			s[slot.row - 1] = true;
			const pos = { col: slot.col, row: slot.row, rowSpan: 1 };
			map.set(item.id, pos);
			if (item.id !== undefined && item.id !== null) {
				map.set(String(item.id), pos);
			}
		}
	}

	return map;
}
