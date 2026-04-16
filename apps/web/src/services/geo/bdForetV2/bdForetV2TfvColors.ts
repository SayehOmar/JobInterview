export const BD_FORET_V2_TFV_LABELS: string[] = [
  "Forêt fermée sans couvert arboré",
  "Forêt fermée de feuillus purs en îlots",
  "Forêt fermée de chênes décidus purs",
  "Forêt fermée de chênes sempervirents purs",
  "Forêt fermée de hêtre pur",
  "Forêt fermée de châtaignier pur",
  "Forêt fermée de robinier pur",
  "Forêt fermée d’un autre feuillu pur",
  "Forêt fermée à mélange de feuillus",
  "Forêt fermée de conifères purs en îlots",
  "Forêt fermée de pin maritime pur",
  "Forêt fermée de pin sylvestre pur",
  "Forêt fermée de pin laricio ou pin noir pur",
  "Forêt fermée de pin d’Alep pur",
  "Forêt fermée de pin à crochets ou pin cembro pur",
  "Forêt fermée d’un autre pin pur",
  "Forêt fermée à mélange de pins purs",
  "Forêt fermée de sapin ou épicéa",
  "Forêt fermée de mélèze pur",
  "Forêt fermée de douglas pur",
  "Forêt fermée à mélange d’autres conifères",
  "Forêt fermée d’un autre conifère pur autre que pin",
  "Forêt fermée à mélange de conifères",
  "Forêt fermée à mélange de feuillus prépondérants et conifères",
  "Forêt fermée à mélange de conifères prépondérants et feuillus",
  "Forêt ouverte sans couvert arboré",
  "Forêt ouverte de feuillus purs",
  "Forêt ouverte de conifères purs",
  "Forêt ouverte à mélange de feuillus et conifères",
  "Peupleraie",
  "Lande",
  "Formation herbacée",
];

const STORAGE_KEY = "forest-bd-bdforetv2-tfv-colors";
const VISIBILITY_STORAGE_KEY = "forest-bd-bdforetv2-tfv-visibility";

export type BdForetV2TfvColorMap = Record<string, string>;
export type BdForetV2TfvVisibilityMap = Record<string, boolean>;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hslToHex(h: number, s: number, l: number): string {
  // h in [0..360], s/l in [0..1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) [r, g, b] = [c, x, 0];
  else if (hh >= 1 && hh < 2) [r, g, b] = [x, c, 0];
  else if (hh >= 2 && hh < 3) [r, g, b] = [0, c, x];
  else if (hh >= 3 && hh < 4) [r, g, b] = [0, x, c];
  else if (hh >= 4 && hh < 5) [r, g, b] = [x, 0, c];
  else if (hh >= 5 && hh < 6) [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Deterministic readable color from a label (used when no user override exists). */
export function defaultColorForTfv(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  // Brighter / shinier palette (high saturation + slightly higher lightness).
  // These are meant to pop on satellite/dark basemaps.
  const sat = clamp01(0.9);
  const light = clamp01(0.6);
  return hslToHex(hue, sat, light);
}

export function loadBdForetV2TfvColorOverrides(): BdForetV2TfvColorMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: BdForetV2TfvColorMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string" && v.trim()) {
        out[k] = v.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveBdForetV2TfvColorOverrides(map: BdForetV2TfvColorMap): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned: BdForetV2TfvColorMap = {};
    for (const [k, v] of Object.entries(map)) {
      if (typeof k === "string" && typeof v === "string" && v.trim()) {
        cleaned[k] = v.trim();
      }
    }
    if (Object.keys(cleaned).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch {
    /* ignore */
  }
}

export function getBdForetV2TfvColor(
  tfv: string,
  overrides: BdForetV2TfvColorMap,
): string {
  return overrides[tfv] ?? defaultColorForTfv(tfv);
}

export function loadBdForetV2TfvVisibility(): BdForetV2TfvVisibilityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: BdForetV2TfvVisibilityMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "boolean") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveBdForetV2TfvVisibility(
  visibility: BdForetV2TfvVisibilityMap,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    /* ignore */
  }
}

export function isBdForetV2TfvVisible(
  tfv: string,
  visibility: BdForetV2TfvVisibilityMap,
): boolean {
  return visibility[tfv] !== false;
}

