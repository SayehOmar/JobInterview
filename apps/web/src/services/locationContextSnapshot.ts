import type { Map } from 'mapbox-gl';
import { queryAllLayers, type FeatureInfoResponse } from '@/services/wmsFeatureInfo';
import { getPolygonGeometryCentroid } from '@/services/geometryCentroid';

function propsFromResponse(f: FeatureInfoResponse | null): Record<string, unknown> | null {
    const p = f?.features?.[0]?.properties;
    if (!p || typeof p !== 'object') return null;
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
};

export async function buildLocationContextFromDrawnGeometry(
    geometry: Record<string, unknown>,
    map: Map,
): Promise<SavedLocationContext | null> {
    const ll = getPolygonGeometryCentroid(geometry);
    if (!ll) return null;
    const [lng, lat] = ll;
    const data = await queryAllLayers(lng, lat, map);
    return {
        sampleLng: lng,
        sampleLat: lat,
        forest: propsFromResponse(data.forest),
        region: propsFromResponse(data.region),
        department: propsFromResponse(data.department),
        commune: propsFromResponse(data.commune),
    };
}
