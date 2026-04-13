import { bbox } from "@turf/turf";
import type { FeatureCollection, Geometry } from "geojson";

function parseGeometry(raw: unknown): Geometry | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const g = JSON.parse(raw) as unknown;
      return parseGeometry(g);
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && raw != null && "type" in raw) {
    const t = (raw as { type: string }).type;
    if (
      t === "Polygon" ||
      t === "MultiPolygon" ||
      t === "MultiLineString" ||
      t === "LineString" ||
      t === "Point"
    ) {
      return raw as Geometry;
    }
  }
  return null;
}

/**
 * Fit the map view to a polygon geometry. Uses right padding so a right-docked
 * analysis panel does not cover the feature.
 */
export function flyMapToPolygonGeometry(
  map: { fitBounds: (b: [[number, number], [number, number]], o?: object) => void },
  geometry: unknown,
  options?: { rightPaddingPx?: number; durationMs?: number },
): boolean {
  const geom = parseGeometry(geometry);
  if (!geom) return false;

  const right = options?.rightPaddingPx ?? 440;
  const duration = options?.durationMs ?? 1100;

  try {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: geom }],
    };
    const box = bbox(fc);
    const [minLng, minLat, maxLng, maxLat] = box;
    if (
      !Number.isFinite(minLng) ||
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLng) ||
      !Number.isFinite(maxLat)
    ) {
      return false;
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: { top: 48, bottom: 48, left: 48, right },
        duration,
        essential: true,
        maxZoom: 16,
      },
    );
    return true;
  } catch {
    return false;
  }
}
