const GEOSERVER_URL = "/geoserver"; // Proxy through Next.js
const WORKSPACE = process.env.NEXT_PUBLIC_GEOSERVER_WORKSPACE || "prod";
/** Proxied IGN Géoplateforme WMS (see `next.config.ts` → `/ign-wms` → `data.geopf.fr/wms-r`). */
const IGN_WMS_URL = "/ign-wms";
// (WMTS removed — keeping only WFS for BD Forêt v1/v2 layers)

/** Normalize layer color strings (hex, rgb(), etc.) to #rrggbb for UI and map tint. */
export function normalizeLayerColorToHex(input: string): string {
  const s = input.trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return (
        "#" +
        hex
          .split("")
          .map((c) => c + c)
          .join("")
      );
    }
    return "#" + hex.slice(0, 6);
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const r = Math.min(255, parseInt(rgb[1], 10));
    const g = Math.min(255, parseInt(rgb[2], 10));
    const b = Math.min(255, parseInt(rgb[3], 10));
    return (
      "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
    );
  }
  return "#666666";
}

export interface WMSLayerConfig {
  id: string;
  name: string;
  layerName: string;
  /** Where tile + GFI requests are sent. Default: GeoServer workspace layers. */
  wmsBackend?: "geoserver" | "ign_geopf" | "ign_wfs";
  /**
   * IGN WMS layer name as published on `data.geopf.fr/wms-r` (e.g. `LANDCOVER.FORESTINVENTORY.V2`).
   * Only used when `wmsBackend === "ign_geopf"`.
   */
  ignLayerName?: string;
  /** WMS version for IGN layers (GeoServer path keeps 1.1.0 for compatibility). */
  wmsVersion?: "1.1.0" | "1.3.0";
  /** WMS style name for IGN layers (often `normal`). */
  wmsStyle?: string;
  /** WFS typeName when `wmsBackend === "ign_wfs"`. */
  wfsTypeName?: string;
  /** Optional legend image URL (usually from capabilities). */
  legendUrl?: string;
  minZoom: number;
  maxZoom: number;
  opacity: number;
  visible: boolean;
  color?: string;
  description: string;
}

export const WMS_LAYERS: WMSLayerConfig[] = [
  {
    id: "region",
    name: "Region",
    layerName: "region",
    minZoom: 0,
    maxZoom: 8,
    opacity: 0.6,
    visible: true,
    color: "#8B0000",
    description: "Administrative regions",
  },
  {
    id: "department",
    name: "Department",
    layerName: "department",
    minZoom: 8,
    maxZoom: 10,
    opacity: 0.6,
    visible: true,
    color: "#FF8C00",
    description: "Departments",
  },
  {
    id: "commune",
    name: "Commune",
    layerName: "cummune",
    minZoom: 10,
    maxZoom: 22,
    opacity: 0.5,
    visible: true,
    color: "#32CD32",
    description: "Communes",
  },
  {
    id: "forest",
    name: "Forest (BD Forêt)",
    layerName: "forest",
    wmsBackend: "geoserver",
    minZoom: 0,
    maxZoom: 22,
    opacity: 0.9,
    visible: true,
    color: "rgb(102,255,0)",
    description: "Forest inventory data",
  },
  {
    id: "bd_foret_v2_polygons",
    name: "BD Forêt v2 polygons (WFS)",
    layerName: "bd_foret_v2_polygons",
    wmsBackend: "ign_wfs",
    wfsTypeName: "LANDCOVER.FORESTINVENTORY.V2:formation_vegetale",
    // Same semantic classes as the WMTS tiles.
    legendUrl:
      "https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.FORESTINVENTORY.V2-legend.png",
    minZoom: 0,
    maxZoom: 22,
    opacity: 0.35,
    visible: false,
    color: "#16a34a",
    description: "Vector polygons from GeoPF WFS (may be heavy)",
  },
  {
    id: "cadastre",
    name: "Cadastre",
    layerName: "cadastre", // Adjust if different
    minZoom: 15,
    maxZoom: 22,
    opacity: 0.8,
    visible: false,
    color: "#8B4513",
    description: "Land parcels (zoom > 15)",
  },
];

export const buildWMSUrl = (layerName: string): string => {
  return `${GEOSERVER_URL}/${WORKSPACE}/wms`;
};

export const getWMSTileUrl = (
  layer: WMSLayerConfig,
  cqlFilter?: string,
): string => {
  const backend = layer.wmsBackend ?? "geoserver";

  if (backend === "ign_wfs") {
    // Not a raster tile layer.
    return "";
  }

  if (backend === "ign_geopf") {
    const ignLayer = layer.ignLayerName;
    if (!ignLayer) {
      throw new Error(`IGN layer missing ignLayerName for id=${layer.id}`);
    }
    const version = layer.wmsVersion ?? "1.3.0";
    const style = layer.wmsStyle ?? "normal";

    // IMPORTANT: keep `{bbox-epsg-3857}` unencoded so Mapbox can substitute it.
    return (
      `${IGN_WMS_URL}?` +
      `SERVICE=WMS&` +
      `VERSION=${encodeURIComponent(version)}&` +
      `REQUEST=GetMap&` +
      `LAYERS=${encodeURIComponent(ignLayer)}&` +
      `STYLES=${encodeURIComponent(style)}&` +
      `FORMAT=image/png&` +
      `TRANSPARENT=true&` +
      `CRS=EPSG:3857&` +
      `BBOX={bbox-epsg-3857}&` +
      `WIDTH=256&` +
      `HEIGHT=256`
    );
  }

  let url =
    `${GEOSERVER_URL}/${WORKSPACE}/wms?` +
    `service=WMS&` +
    `version=1.1.0&` +
    `request=GetMap&` +
    `layers=${WORKSPACE}:${layer.layerName}&` +
    `styles=&` +
    `format=image/png&` +
    `transparent=true&` +
    `srs=EPSG:3857&` +
    `bbox={bbox-epsg-3857}&` +
    `width=256&` +
    `height=256`;
  if (cqlFilter) {
    url += `&CQL_FILTER=${encodeURIComponent(cqlFilter)}`;
  }
  return url;
};

