import * as turf from "@turf/turf";
import { intersectionAreaHectares } from "@/services/geo/geometry/forestPolygonIntersection";

const GEOFP_WFS_URL = "/ign-wfs/ows";
const FOREST_TYPENAME = "LANDCOVER.FORESTINVENTORY.V2:formation_vegetale";
/** BBOX queries can return many parcels; keep in sync for total overlap vs class breakdown. */
const WFS_BBOX_MAX_FEATURES = "5000";

export type BdForetV2ClassOverlap = {
  tfv: string;
  code_tfv?: string;
  tfv_g11?: string;
  essences: string[];
  overlapHectares: number;
  featureCount: number;
};

/**
 * Fetch BD Forêt v2 polygons in the user polygon's bounding box (WGS84) and sum
 * intersection area (ha). WFS returns full MultiPolygon features in EPSG:4326.
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
    count: WFS_BBOX_MAX_FEATURES,
    bbox: `${minx},${miny},${maxx},${maxy},EPSG:4326`,
  });

  const url = `${GEOFP_WFS_URL}?${params.toString()}`;

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

/** Breakdown of all intersecting BD Forêt v2 classes for a user polygon. */
export async function getBdForetV2ClassBreakdownFromWfs(
  userGeometry: GeoJSON.Geometry,
): Promise<BdForetV2ClassOverlap[] | null> {
  if (userGeometry.type !== "Polygon" && userGeometry.type !== "MultiPolygon") {
    return [];
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
    count: WFS_BBOX_MAX_FEATURES,
    bbox: `${minx},${miny},${maxx},${maxy},EPSG:4326`,
  });
  const url = `${GEOFP_WFS_URL}?${params.toString()}`;
  let data: { features?: GeoJSON.Feature[] };
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }

  const groups = new Map<string, BdForetV2ClassOverlap>();
  for (const f of data.features ?? []) {
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    const ha = intersectionAreaHectares(userGeometry, g);
    if (!(ha != null && ha > 0)) continue;

    const p = (f.properties ?? {}) as Record<string, unknown>;
    const tfv = String(p.tfv ?? "Unknown");
    const code = p.code_tfv != null ? String(p.code_tfv) : undefined;
    const tfvG11 = p.tfv_g11 != null ? String(p.tfv_g11) : undefined;
    const essence = p.essence != null ? String(p.essence) : undefined;

    const cur =
      groups.get(tfv) ??
      ({
        tfv,
        code_tfv: code,
        tfv_g11: tfvG11,
        essences: [],
        overlapHectares: 0,
        featureCount: 0,
      } satisfies BdForetV2ClassOverlap);

    cur.overlapHectares += ha;
    cur.featureCount += 1;
    if (essence && !cur.essences.includes(essence)) cur.essences.push(essence);
    if (!cur.code_tfv && code) cur.code_tfv = code;
    if (!cur.tfv_g11 && tfvG11) cur.tfv_g11 = tfvG11;
    groups.set(tfv, cur);
  }
  return [...groups.values()].sort((a, b) => b.overlapHectares - a.overlapHectares);
}

/** Fetch nearest BD Forêt v2 feature around a point and return its properties. */
export async function getBdForetV2PropsAtPoint(
  lng: number,
  lat: number,
): Promise<Record<string, unknown> | null> {
  // Tiny search envelope around centroid (WGS84)
  const d = 0.0015; // ~150m latitude; good balance for polygon hit chance
  const minx = lng - d;
  const miny = lat - d;
  const maxx = lng + d;
  const maxy = lat + d;
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: FOREST_TYPENAME,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    count: "1",
    bbox: `${minx},${miny},${maxx},${maxy},EPSG:4326`,
  });
  const url = `${GEOFP_WFS_URL}?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: GeoJSON.Feature[] };
    const p = data.features?.[0]?.properties;
    if (!p || typeof p !== "object") return null;
    return p as Record<string, unknown>;
  } catch {
    return null;
  }
}

