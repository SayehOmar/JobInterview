import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { FeatureInfoResponse } from "@/services/geo/wms/wmsFeatureInfo";

function asPolyFeature(
  g: GeoJSON.Geometry,
): Feature<Polygon | MultiPolygon> | null {
  if (g.type === "Polygon" || g.type === "MultiPolygon") {
    return turf.feature(g);
  }
  return null;
}

/**
 * GeoJSON geometry for the forest parcel from WMS GetFeatureInfo (application/json).
 */
export function getForestGeometryFromFeatureInfo(
  fr: FeatureInfoResponse | null,
): GeoJSON.Geometry | null {
  const g = fr?.features?.[0]?.geometry;
  if (!g || typeof g !== "object") return null;
  if (g.type === "Polygon" || g.type === "MultiPolygon") {
    return g as GeoJSON.Geometry;
  }
  return null;
}

/**
 * Area (hectares) of overlap between the user polygon and the forest parcel polygon.
 * Uses geodesic area from Turf (m² → ha). Returns 0 if no overlap, null if not computable.
 */
export function intersectionAreaHectares(
  userGeometry: GeoJSON.Geometry,
  forestGeometry: GeoJSON.Geometry | null | undefined,
): number | null {
  if (!forestGeometry) return null;
  const a = asPolyFeature(userGeometry);
  const b = asPolyFeature(forestGeometry);
  if (!a || !b) return null;
  try {
    const fc = turf.featureCollection([a, b]);
    const inter = turf.intersect(fc);
    if (!inter) return 0;
    const sqm = turf.area(inter);
    return sqm / 10000;
  } catch {
    return null;
  }
}

