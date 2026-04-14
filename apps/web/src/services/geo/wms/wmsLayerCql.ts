import type { MapFilters } from "@/store/mapStore";
import { buildForestLayerCql } from "@/services/geo/wms/forestLayerCql";

/**
 * GeoServer CQL for prod:* WMS layers. Uses typical PostGIS view column names; if
 * tiles disappear, check layer attributes in GeoServer and adjust env or this file.
 */
const Q = (s: string) => s.replace(/'/g, "''");

const REGION_INSEE = process.env.NEXT_PUBLIC_WMS_REGION_CODE_ATTR ?? "code_insee";
const CODE_REGION = process.env.NEXT_PUBLIC_WMS_CODE_REGION_ATTR ?? "code_region";
const DEPT_INSEE = process.env.NEXT_PUBLIC_WMS_DEPT_CODE_ATTR ?? "code_insee";
const COMMUNE_INSEE = process.env.NEXT_PUBLIC_WMS_COMMUNE_CODE_ATTR ?? "code_insee";
const COMMUNE_DEPT =
  process.env.NEXT_PUBLIC_WMS_COMMUNE_DEPT_ATTR ?? "code_insee_du_departement";

/**
 * Builds a CQL_FILTER fragment for the given UI layer id so only features matching
 * the active Explore-area filters are requested (fewer empty tiles / less paint).
 */
export function buildWmsCqlForLayer(
  layerId: string,
  filters: MapFilters,
): string | undefined {
  const { regionCode, departementCode, communeCode } = filters;

  if (layerId === "region") {
    if (regionCode) return `${REGION_INSEE}='${Q(regionCode)}'`;
    return undefined;
  }

  if (layerId === "department") {
    if (departementCode) return `${DEPT_INSEE}='${Q(departementCode)}'`;
    if (regionCode) return `${CODE_REGION}='${Q(regionCode)}'`;
    return undefined;
  }

  if (layerId === "commune") {
    if (communeCode) return `${COMMUNE_INSEE}='${Q(communeCode)}'`;
    if (departementCode) {
      return `${COMMUNE_DEPT}='${Q(departementCode)}'`;
    }
    if (regionCode) return `${CODE_REGION}='${Q(regionCode)}'`;
    return undefined;
  }

  if (layerId === "forest") {
    return buildForestLayerCql(filters);
  }

  return undefined;
}

