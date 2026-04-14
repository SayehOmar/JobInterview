import {
  normalizeLayerColorToHex,
  WMS_LAYERS,
  type WMSLayerConfig,
} from "./wmsLayers";

const STORAGE_KEY = "forest-bd-wms-layer-colors";

/** Persisted shape: layer id → hex color (only user overrides vs defaults). */
function buildOverrides(layers: WMSLayerConfig[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of layers) {
    const def = WMS_LAYERS.find((d) => d.id === l.id);
    const cur = normalizeLayerColorToHex(l.color ?? def?.color ?? "#888888");
    const base = normalizeLayerColorToHex(def?.color ?? "#888888");
    if (cur !== base) {
      out[l.id] = cur;
    }
  }
  return out;
}

export function loadLayerColorOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [id, val] of Object.entries(parsed)) {
      if (typeof val === "string" && val.trim()) {
        out[id] = normalizeLayerColorToHex(val);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveLayerColorOverrides(layers: WMSLayerConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    const overrides = buildOverrides(layers);
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch {
    /* quota / private mode */
  }
}

export function mergeLayersWithStoredColors(base: WMSLayerConfig[]): WMSLayerConfig[] {
  const stored = loadLayerColorOverrides();
  if (Object.keys(stored).length === 0) return base;
  return base.map((l) => {
    const hex = stored[l.id];
    return hex ? { ...l, color: hex } : l;
  });
}

