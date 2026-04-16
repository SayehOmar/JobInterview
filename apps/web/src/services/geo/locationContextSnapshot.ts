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
import {
  type BdForetV2ClassOverlap,
  getBdForetV2ClassBreakdownFromWfs,
  getBdForetV2PropsAtPoint,
  sumForestOverlapFromWfs,
} from "@/services/geo/wfs/forestWfsOverlap";

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
  /** All intersecting BD Forêt v2 classes for the drawn polygon */
  forestClassBreakdown?: BdForetV2ClassOverlap[];
};

export async function buildLocationContextFromDrawnGeometry(
  geometry: Record<string, unknown>,
  map: Map,
): Promise<SavedLocationContext | null> {
  const ll = getPolygonGeometryCentroid(geometry);
  if (!ll) return null;
  const [lng, lat] = ll;
  const data = await queryAllLayers(lng, lat, map);
  const forestV2Props = await getBdForetV2PropsAtPoint(lng, lat);
  const userGeom = geometry as unknown as GeoJSON.Geometry;
  let forestIntersectionHectares: number | null = null;
  let forestClassBreakdown: BdForetV2ClassOverlap[] = [];
  if (userGeom.type === "Polygon" || userGeom.type === "MultiPolygon") {
    /** WFS returns full polygons in 4326; GFI JSON often omits geometry. */
    const breakdown = await getBdForetV2ClassBreakdownFromWfs(userGeom);
    const forestGeom = getForestGeometryFromFeatureInfo(data.forest);

    if (Array.isArray(breakdown)) {
      forestClassBreakdown = breakdown;
      if (breakdown.length > 0) {
        forestIntersectionHectares = breakdown.reduce(
          (s, b) => s + b.overlapHectares,
          0,
        );
      } else {
        forestIntersectionHectares = 0;
      }
    }

    if (forestIntersectionHectares == null) {
      const fromWfs = await sumForestOverlapFromWfs(userGeom);
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
  }
  return {
    sampleLng: lng,
    sampleLat: lat,
    // Prefer BD Forêt v2 from GeoPF WFS for saved analysis context.
    forest: forestV2Props ?? propsFromResponse(data.forest),
    region: propsFromResponse(data.region),
    department: propsFromResponse(data.department),
    commune: propsFromResponse(data.commune),
    forestIntersectionHectares,
    forestClassBreakdown,
  };
}

