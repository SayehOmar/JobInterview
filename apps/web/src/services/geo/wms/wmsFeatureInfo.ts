import type { MapFilters } from "@/store/mapStore";
import { buildWmsCqlForLayer } from "@/services/geo/wms/wmsLayerCql";
import {
  WMS_LAYERS,
  type WMSLayerConfig,
} from "@/services/geo/wms/wmsLayers";

const GEOSERVER_URL = "/geoserver";
const WORKSPACE = "prod";
const IGN_WMS_URL = "/ign-wms";

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
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return [x, y];
}

export const getFeatureInfo = async (
  layer: WMSLayerConfig,
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

  const backend = layer.wmsBackend ?? "geoserver";

  if (backend === "ign_geopf") {
    const ignLayer = layer.ignLayerName;
    if (!ignLayer) return null;
    const version = layer.wmsVersion ?? "1.3.0";
    const style = layer.wmsStyle ?? "normal";

    const params = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: version,
      REQUEST: "GetFeatureInfo",
      LAYERS: ignLayer,
      QUERY_LAYERS: ignLayer,
      STYLES: style,
      // Required by IGN GeoPF WMS-R for GetFeatureInfo (mirrors underlying map format)
      FORMAT: "image/png",
      INFO_FORMAT: "application/json",
      FEATURE_COUNT: "1",
      CRS: "EPSG:3857",
      BBOX: `${minx},${miny},${maxx},${maxy}`,
      WIDTH: map.getCanvas().width.toString(),
      HEIGHT: map.getCanvas().height.toString(),
    });

    // WMS 1.3.0 uses i/j; 1.1.x uses x/y. IGN GeoPF is 1.3.0 here.
    if (version.startsWith("1.3")) {
      params.set("I", Math.floor(point.x).toString());
      params.set("J", Math.floor(point.y).toString());
    } else {
      params.set("X", Math.floor(point.x).toString());
      params.set("Y", Math.floor(point.y).toString());
    }

    const url = `${IGN_WMS_URL}?${params.toString()}`;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching IGN GFI ${ignLayer}:`, error);
      return null;
    }
  }

  const params = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetFeatureInfo",
    layers: `${WORKSPACE}:${layer.layerName}`,
    query_layers: `${WORKSPACE}:${layer.layerName}`,
    styles: "",
    format: "image/png",
    transparent: "true",
    srs: "EPSG:3857",
    bbox: `${minx},${miny},${maxx},${maxy}`,
    width: map.getCanvas().width.toString(), // correct
    height: map.getCanvas().height.toString(), // correct
    x: Math.floor(point.x).toString(),
    y: Math.floor(point.y).toString(),
    info_format: "application/json",
    feature_count: "1",
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
    console.error(`Error fetching ${layer.layerName}:`, error);
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
  const skipRegion = Boolean(filters.departementCode || filters.communeCode);
  const skipDepartment = Boolean(filters.communeCode);

  const cqlRegion = buildWmsCqlForLayer("region", filters);
  const cqlDept = buildWmsCqlForLayer("department", filters);
  const cqlCommune = buildWmsCqlForLayer("commune", filters);
  const cqlForest = buildWmsCqlForLayer("forest", filters);

  const layer = (id: string) => WMS_LAYERS.find((l) => l.id === id);
  const regionL = layer("region");
  const deptL = layer("department");
  const communeL = layer("commune");
  const forestL = layer("forest");
  if (!regionL || !deptL || !communeL || !forestL) {
    console.error("WMS_LAYERS missing expected ids (region/department/commune/forest)");
  }

  const [region, department, commune, forest] = await Promise.all([
    skipRegion || !regionL
      ? Promise.resolve(null)
      : getFeatureInfo(regionL, lng, lat, map, cqlRegion),
    skipDepartment || !deptL
      ? Promise.resolve(null)
      : getFeatureInfo(deptL, lng, lat, map, cqlDept),
    communeL ? getFeatureInfo(communeL, lng, lat, map, cqlCommune) : Promise.resolve(null),
    forestL ? getFeatureInfo(forestL, lng, lat, map, cqlForest) : Promise.resolve(null),
  ]);

  return { region, department, commune, forest };
};

