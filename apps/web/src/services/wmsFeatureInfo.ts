import type { MapFilters } from '@/store/mapStore';
import { buildWmsCqlForLayer } from '@/services/wmsLayerCql';

const GEOSERVER_URL = '/geoserver';
const WORKSPACE = 'prod';

export interface FeatureInfoResponse {
    type: string;
    features: Array<{
        type: string;
        id: string;
        geometry: any;
        properties: Record<string, any>;
    }>;
    totalFeatures: number;
    numberReturned: number;
    timeStamp: string;
    crs: any;
}

function lngLatTo3857(lng: number, lat: number): [number, number] {
    const x = (lng * 20037508.34) / 180;
    let y =
        Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) /
        (Math.PI / 180);
    y = (y * 20037508.34) / 180;
    return [x, y];
}

export const getFeatureInfo = async (
    layerName: string,
    lng: number,
    lat: number,
    map: mapboxgl.Map,
    cqlFilter?: string,
): Promise<FeatureInfoResponse | null> => {
    const point = map.project([lng, lat]);
    const bounds = map.getBounds();

    // Convert bounds to EPSG:3857
    // @ts-ignore
    const [minx, miny] = lngLatTo3857(bounds.getWest(), bounds.getSouth());
    // @ts-ignore
    const [maxx, maxy] = lngLatTo3857(bounds.getEast(), bounds.getNorth());


    const params = new URLSearchParams({
        service: 'WMS',
        version: '1.1.1',
        request: 'GetFeatureInfo',
        layers: `${WORKSPACE}:${layerName}`,
        query_layers: `${WORKSPACE}:${layerName}`,
        styles: '',
        format: 'image/png',
        transparent: 'true',
        srs: 'EPSG:3857',
        bbox: `${minx},${miny},${maxx},${maxy}`,
        width: map.getCanvas().width.toString(),   // correct
        height: map.getCanvas().height.toString(), // correct
        x: Math.floor(point.x).toString(),
        y: Math.floor(point.y).toString(),
        info_format: 'application/json',
        feature_count: '1',
    });

    let url = `${GEOSERVER_URL}/${WORKSPACE}/wms?${params.toString()}`;
    if (cqlFilter) {
        url += `&CQL_FILTER=${encodeURIComponent(cqlFilter)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${layerName}:`, error);
        return null;
    }
};

/**
 * Feature info for map click. Skips coarser admin layers when finer filters are set
 * to reduce HTTP calls. Uses the same CQL as map tiles when possible.
 */
export const queryAllLayers = async (
    lng: number,
    lat: number,
    map: mapboxgl.Map,
    filters: MapFilters = {},
): Promise<{
    region: FeatureInfoResponse | null;
    department: FeatureInfoResponse | null;
    commune: FeatureInfoResponse | null;
    forest: FeatureInfoResponse | null;
}> => {
    const skipRegion = Boolean(
        filters.departementCode || filters.communeCode,
    );
    const skipDepartment = Boolean(filters.communeCode);

    const cqlRegion = buildWmsCqlForLayer('region', filters);
    const cqlDept = buildWmsCqlForLayer('department', filters);
    const cqlCommune = buildWmsCqlForLayer('commune', filters);
    const cqlForest = buildWmsCqlForLayer('forest', filters);

    const [region, department, commune, forest] = await Promise.all([
        skipRegion
            ? Promise.resolve(null)
            : getFeatureInfo('region', lng, lat, map, cqlRegion),
        skipDepartment
            ? Promise.resolve(null)
            : getFeatureInfo('department', lng, lat, map, cqlDept),
        getFeatureInfo('cummune', lng, lat, map, cqlCommune),
        getFeatureInfo('forest', lng, lat, map, cqlForest),
    ]);

    return { region, department, commune, forest };
};