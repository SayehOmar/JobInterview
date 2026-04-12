import type { SavedLocationContext } from '@/services/locationContextSnapshot';

export type SpeciesRow = { species: string; areaHectares: number; percentage: number };

/** Try common BD Forêt / GeoServer attribute names for parcel surface (hectares). */
export function parseForestSurfaceHectares(forest: Record<string, unknown> | null | undefined): number | null {
    if (!forest) return null;
    const keys = [
        'SUPERFICIE',
        'SUPERFICIE_HA',
        'SURFACE',
        'SURFACE_HA',
        'surface_ha',
        'surface',
        'AREA_HA',
        'AREA',
        'area_ha',
        'ha',
        'superficie',
    ];
    for (const k of keys) {
        const v = forest[k];
        if (v == null) continue;
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
        if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
}

function splitEssence(essence: string): string[] {
    return essence
        .split(/[,;/+]|(?:\s+et\s+)|(?:\s+and\s+)/i)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Prefer stored analysis; if empty, derive one row per species token from BD Forêt ESSENCE
 * and optional parcel surface / polygon area for ha & %.
 */
export function buildEffectiveSpeciesRows(
    analysisSpecies: SpeciesRow[] | undefined | null,
    forest: Record<string, unknown> | null | undefined,
    polygonAreaHa: number,
    parcelSurfaceHa: number | null,
    /** Prefer overlap area with BD Forêt parcel (ha) when available */
    forestIntersectionHectares: number | null | undefined,
): SpeciesRow[] {
    const fromAnalysis = [...(analysisSpecies || [])].filter((r) => r.species);
    if (fromAnalysis.length > 0) return fromAnalysis;

    const raw =
        forest?.ESSENCE ??
        forest?.essence ??
        forest?.essences ??
        forest?.Essence ??
        forest?.ESPECES ??
        null;
    if (raw == null || raw === '') return [];

    const essenceStr = typeof raw === 'string' ? raw : String(raw);
    const forestCoverHa =
        forestIntersectionHectares != null && Number.isFinite(forestIntersectionHectares) && forestIntersectionHectares >= 0
            ? Math.min(forestIntersectionHectares, polygonAreaHa)
            : null;

    if (!essenceStr.trim() || /^nc$/i.test(essenceStr.trim())) {
        return [
            {
                species: 'Not classified (NC)',
                areaHectares: forestCoverHa ?? Math.min(polygonAreaHa, parcelSurfaceHa ?? polygonAreaHa),
                percentage: 100,
            },
        ];
    }

    const parts = splitEssence(essenceStr);
    const names = parts.length > 0 ? parts : [essenceStr.trim()];
    const baseHa =
        forestCoverHa ??
        (parcelSurfaceHa != null && parcelSurfaceHa > 0
            ? Math.min(polygonAreaHa, parcelSurfaceHa)
            : polygonAreaHa);
    const perHa = baseHa / names.length;
    return names.map((species) => ({
        species,
        areaHectares: perHa,
        percentage: 100 / names.length,
    }));
}

export function buildEffectiveForestCover(
    analysis: {
        totalForestArea?: number | null;
        coveragePercentage?: number | null;
        plotCount?: number | null;
    } | null | undefined,
    forest: Record<string, unknown> | null | undefined,
    polygonAreaHa: number,
    parcelSurfaceHa: number | null,
    /** True overlap (ha) between user polygon and BD Forêt parcel geometry */
    forestIntersectionHectares: number | null | undefined,
): { totalForestHa: number; coveragePct: number; plotCount: number } {
    const aForest = analysis?.totalForestArea;
    const aCov = analysis?.coveragePercentage;
    const aPlots = analysis?.plotCount;

    if (
        forestIntersectionHectares != null &&
        Number.isFinite(forestIntersectionHectares) &&
        forestIntersectionHectares >= 0 &&
        polygonAreaHa > 0
    ) {
        const coverHa = Math.min(forestIntersectionHectares, polygonAreaHa);
        return {
            totalForestHa: coverHa,
            coveragePct: Math.min(100, (coverHa / polygonAreaHa) * 100),
            plotCount: forest?.ID || forest?.id ? 1 : 0,
        };
    }

    if (aForest != null && Number.isFinite(aForest) && aForest > 0) {
        return {
            totalForestHa: aForest,
            coveragePct:
                aCov != null && Number.isFinite(aCov) && aCov > 0
                    ? Math.min(100, aCov)
                    : polygonAreaHa > 0
                      ? Math.min(100, (aForest / polygonAreaHa) * 100)
                      : 0,
            plotCount: aPlots != null && aPlots > 0 ? aPlots : forest?.ID || forest?.id ? 1 : 0,
        };
    }

    if (!forest || !(forest.ID ?? forest.id)) {
        return {
            totalForestHa: 0,
            coveragePct: 0,
            plotCount: 0,
        };
    }

    const coverHa =
        parcelSurfaceHa != null && parcelSurfaceHa > 0
            ? Math.min(polygonAreaHa, parcelSurfaceHa)
            : polygonAreaHa;
    const coveragePct = polygonAreaHa > 0 ? Math.min(100, (coverHa / polygonAreaHa) * 100) : 0;

    return {
        totalForestHa: coverHa,
        coveragePct,
        plotCount: 1,
    };
}

export function mergeLocationContext(
    saved: SavedLocationContext | null | undefined,
    fresh: SavedLocationContext | null | undefined,
): SavedLocationContext | null {
    if (fresh && saved) {
        return {
            sampleLng: fresh.sampleLng,
            sampleLat: fresh.sampleLat,
            forest: fresh.forest ?? saved.forest,
            region: fresh.region ?? saved.region,
            department: fresh.department ?? saved.department,
            commune: fresh.commune ?? saved.commune,
            forestIntersectionHectares:
                fresh.forestIntersectionHectares ?? saved.forestIntersectionHectares,
        };
    }
    return fresh ?? saved ?? null;
}
