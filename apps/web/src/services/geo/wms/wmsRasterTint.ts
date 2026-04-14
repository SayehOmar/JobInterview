import { normalizeLayerColorToHex } from "./wmsLayers";

/**
 * Mapbox / MapLibre raster paint props to approximate a user-chosen color vs the layer baseline.
 * WMS tiles are server-rendered; we shift hue/saturation/brightness relative to the default legend color.
 */
export type RasterTintPaint = {
  "raster-hue-rotate": number;
  "raster-saturation": number;
  "raster-brightness-min": number;
  "raster-brightness-max": number;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeLayerColorToHex(hex).replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function hueDelta(fromDeg: number, toDeg: number): number {
  let d = toDeg - fromDeg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

const IDENTITY: RasterTintPaint = {
  "raster-hue-rotate": 0,
  "raster-saturation": 0,
  "raster-brightness-min": 0,
  "raster-brightness-max": 1,
};

export function getRasterTintPaintProps(
  baselineColor: string | undefined,
  currentColor: string | undefined,
): RasterTintPaint {
  const baseHex = baselineColor ? normalizeLayerColorToHex(baselineColor) : "#888888";
  const curHex = currentColor ? normalizeLayerColorToHex(currentColor) : baseHex;
  if (baseHex.toLowerCase() === curHex.toLowerCase()) {
    return IDENTITY;
  }

  const br = hexToRgb(baseHex);
  const cr = hexToRgb(curHex);
  const base = rgbToHsl(br.r, br.g, br.b);
  const cur = rgbToHsl(cr.r, cr.g, cr.b);

  const dh = hueDelta(base.h, cur.h);

  let sat = 0;
  if (base.s > 0.02 || cur.s > 0.02) {
    sat = Math.max(-1, Math.min(1, (cur.s - base.s) * 1.5));
  }

  const dl = cur.l - base.l;
  const bump = dl * 0.45;
  const bmin = Math.max(0, Math.min(1, 0 + bump));
  const bmax = Math.max(0, Math.min(1, 1 + bump));

  return {
    "raster-hue-rotate": dh,
    "raster-saturation": sat,
    "raster-brightness-min": bmin,
    "raster-brightness-max": bmax,
  };
}

export function applyRasterTintToMapLayer(
  map: {
    getLayer: (id: string) => unknown;
    setPaintProperty: (id: string, prop: string, val: unknown) => void;
  },
  mapLayerId: string,
  baselineColor: string | undefined,
  currentColor: string | undefined,
): void {
  if (!map.getLayer(mapLayerId)) return;
  const paint = getRasterTintPaintProps(baselineColor, currentColor);
  (Object.entries(paint) as [keyof RasterTintPaint, number][]).forEach(([k, v]) => {
    try {
      map.setPaintProperty(mapLayerId, k, v);
    } catch {
      /* ignore if engine omits a paint property */
    }
  });
}

