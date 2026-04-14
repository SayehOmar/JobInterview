import { bbox as turfBbox } from "@turf/turf";

const GEOSERVER_URL = "/geoserver";
const WORKSPACE = process.env.NEXT_PUBLIC_GEOSERVER_WORKSPACE || "prod";

const P_INSEE =
  process.env.NEXT_PUBLIC_WMS_COMMUNE_CODE_ATTR ?? "code_insee";

export type LngLatBounds = [[number, number], [number, number]];

function toBounds(b: number[]): LngLatBounds | null {
  if (!Array.isArray(b) || b.length !== 4) return null;
  const [minX, minY, maxX, maxY] = b;
  if (![minX, minY, maxX, maxY].every((n) => Number.isFinite(n))) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/**
 * Fetch a commune feature from GeoServer WFS and compute its bbox in EPSG:4326.
 * Used to zoom/fit the map when a commune is selected.
 */
export async function fetchCommuneBounds(
  communeCode: string,
): Promise<LngLatBounds | null> {
  const q = communeCode.replace(/'/g, "''");
  const cqlAttempts = [
    `${P_INSEE}='${q}'`,
    `code_insee='${q}'`,
    `CODE_INSEE='${q}'`,
    `insee='${q}'`,
    `code_insee_commune='${q}'`,
  ];

  for (const cql of cqlAttempts) {
    const params = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeNames: `${WORKSPACE}:cummune`,
      outputFormat: "application/json",
      srsName: "EPSG:4326",
      count: "1",
      cql_filter: cql,
    });
    const url = `${GEOSERVER_URL}/wfs?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as {
      features?: Array<{ geometry?: GeoJSON.Geometry | null; bbox?: number[] }>;
      bbox?: number[];
    };

    const direct =
      toBounds(data.features?.[0]?.bbox ?? []) ?? toBounds(data.bbox ?? []);
    if (direct) return direct;

    const geom = data.features?.[0]?.geometry;
    if (geom) {
      const b = turfBbox(geom as any);
      const bounds = toBounds(b);
      if (bounds) return bounds;
    }
  }

  return null;
}

