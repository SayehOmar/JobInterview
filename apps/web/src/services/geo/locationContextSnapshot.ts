import type { Map } from "mapbox-gl";
import {
  queryAllLayers,
  type FeatureInfoResponse,
} from "@/services/geo/wms/wmsFeatureInfo";
import { getPolygonGeometryCentroid } from "@/services/geo/geometry/geometryCentroid";
import {
  getForestGeometryFromFeatureInfo,
  intersectionAreaHectares,
} from "@/services/geo/geometry/forestPolygonIntersection";
import { sumForestOverlapFromWfs } from "@/services/geo/wfs/forestWfsOverlap";

function propsFromResponse(
  f: FeatureInfoResponse | null,
): Record<string, unknown> | null {
  const p = f?.features?.[0]?.properties;
  if (!p || typeof p !== "object") return null;
  return { ...(p as Record<string, unknown>) };
}

/** Stored on user_polygons.location_context — matches WMS layers under the polygon centroid. */
export type SavedLocationContext = {
  sampleLng: number;
  sampleLat: number;
  forest: Record<string, unknown> | null;
  region: Record<string, unknown> | null;
  department: Record<string, unknown> | null;
  commune: Record<string, unknown> | null;
  /** Overlap (ha) between drawn polygon and BD Forêt parcel geometry from WMS, when computable */
  forestIntersectionHectares?: number | null;
};

export async function buildLocationContextFromDrawnGeometry(
  geometry: Record<string, unknown>,
  map: Map,
): Promise<SavedLocationContext | null> {
  const ll = getPolygonGeometryCentroid(geometry);
  if (!ll) return null;
  const [lng, lat] = ll;
  const data = await queryAllLayers(lng, lat, map);
  const userGeom = geometry as unknown as GeoJSON.Geometry;
  let forestIntersectionHectares: number | null = null;
  if (userGeom.type === "Polygon" || userGeom.type === "MultiPolygon") {
    /** WFS returns full polygons in 4326; GFI JSON often omits geometry. */
    const fromWfs = await sumForestOverlapFromWfs(userGeom);
    const forestGeom = getForestGeometryFromFeatureInfo(data.forest);

    if (fromWfs != null && fromWfs > 0) {
      forestIntersectionHectares = fromWfs;
    } else if (fromWfs != null && fromWfs === 0) {
      forestIntersectionHectares = forestGeom
        ? intersectionAreaHectares(userGeom, forestGeom)
        : 0;
    } else if (forestGeom) {
      forestIntersectionHectares = intersectionAreaHectares(userGeom, forestGeom);
    }
  }
  return {
    sampleLng: lng,
    sampleLat: lat,
    forest: propsFromResponse(data.forest),
    region: propsFromResponse(data.region),
    department: propsFromResponse(data.department),
    commune: propsFromResponse(data.commune),
    forestIntersectionHectares,
  };
}

