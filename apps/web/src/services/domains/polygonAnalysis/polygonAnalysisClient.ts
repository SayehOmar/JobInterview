import type { Map } from "mapbox-gl";
import type { SavedLocationContext } from "@/services/geo/locationContextSnapshot";
import { buildLocationContextFromDrawnGeometry } from "@/services/geo/locationContextSnapshot";
import {
  buildEffectiveForestCover,
  buildEffectiveSpeciesRows,
  mergeLocationContext,
  parseForestSurfaceHectares,
} from "@/services/geo/polygonAnalysisDisplay";

export type PolygonAnalysisForestMetrics = {
  totalForestHa: number;
  coveragePct: number;
  plotCount: number;
};

export type PolygonAnalysisSpeciesRow = {
  species: string;
  areaHectares: number;
  percentage: number;
};

export type PolygonAnalysisComputed = {
  locationContext: SavedLocationContext | null;
  forest: PolygonAnalysisForestMetrics;
  rows: PolygonAnalysisSpeciesRow[];
};

/**
 * Domain boundary ("service-ready"):
 * Callers should use these functions instead of reaching into WFS/WMS helpers directly.
 * Later, the implementation can be swapped to an HTTP service without changing callers.
 */

export async function refreshLocationContextForGeometry(
  geometry: Record<string, unknown>,
  map: Map,
  saved?: SavedLocationContext | null,
): Promise<SavedLocationContext | null> {
  const fresh = await buildLocationContextFromDrawnGeometry(geometry, map);
  return mergeLocationContext(saved ?? null, fresh);
}

export function computePolygonAnalysis(params: {
  polygonAreaHa: number;
  analysisResults?: {
    plotCount?: number;
    speciesDistribution?: PolygonAnalysisSpeciesRow[];
    totalForestArea?: number;
    coveragePercentage?: number;
  } | null;
  locationContext?: SavedLocationContext | null;
}): PolygonAnalysisComputed {
  const lc = params.locationContext ?? null;
  const forestProps = (lc?.forest ?? null) as Record<string, unknown> | null;
  const parcelSurfaceHa = parseForestSurfaceHectares(forestProps);
  const forestIntersectionHectares =
    lc?.forestIntersectionHectares != null &&
    Number.isFinite(lc.forestIntersectionHectares)
      ? lc.forestIntersectionHectares
      : null;
  const forestClassBreakdown = lc?.forestClassBreakdown ?? null;
  const stats = params.analysisResults || {};

  const forest = buildEffectiveForestCover(
    stats,
    forestProps,
    params.polygonAreaHa,
    parcelSurfaceHa,
    forestIntersectionHectares,
    forestClassBreakdown,
  );

  const rows = buildEffectiveSpeciesRows(
    (stats as any).speciesDistribution,
    forestProps,
    params.polygonAreaHa,
    parcelSurfaceHa,
    forestIntersectionHectares,
    forestClassBreakdown,
  );

  return { locationContext: lc, forest, rows };
}

