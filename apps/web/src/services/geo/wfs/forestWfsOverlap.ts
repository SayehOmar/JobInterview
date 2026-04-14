import * as turf from "@turf/turf";
import { intersectionAreaHectares } from "@/services/geo/geometry/forestPolygonIntersection";

const GEOSERVER_URL = "/geoserver";
const FOREST_TYPENAME = "prod:forest";

/**
 * Fetch BD Forêt polygons in the user polygon's bounding box (WGS84) and sum
 * intersection area (ha). GeoServer WMS GetFeatureInfo often omits geometry;
 * WFS returns full MultiPolygon features in EPSG:4326, matching Mapbox draw.
 */
/** Sum of overlap (ha), or null if the WFS request failed (caller may fall back to GFI geometry). */
export async function sumForestOverlapFromWfs(
  userGeometry: GeoJSON.Geometry,
): Promise<number | null> {
  if (userGeometry.type !== "Polygon" && userGeometry.type !== "MultiPolygon") {
    return 0;
  }

  let bbox: number[];
  try {
    bbox = turf.bbox(turf.feature(userGeometry));
  } catch {
    return null;
  }
  const [minx, miny, maxx, maxy] = bbox;
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: FOREST_TYPENAME,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    count: "120",
    bbox: `${minx},${miny},${maxx},${maxy},EPSG:4326`,
  });

  const url = `${GEOSERVER_URL}/wfs?${params.toString()}`;

  let data: { features?: GeoJSON.Feature[] };
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }

  const features = data.features ?? [];
  let total = 0;
  for (const f of features) {
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    const ha = intersectionAreaHectares(userGeometry, g);
    if (ha != null && ha > 0) total += ha;
  }
  return total;
}

