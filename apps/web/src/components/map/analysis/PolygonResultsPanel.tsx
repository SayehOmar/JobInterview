// components/PolygonResultsPanel.tsx
"use client";

import {
  useEffect,
  useState,
  type HTMLAttributes,
  type RefObject,
} from "react";
import type { Map } from "mapbox-gl";
import {
  X,
  Trees,
  Ruler,
  PieChart,
  BarChart3,
  Leaf,
  Landmark,
  Building2,
  Home,
  Loader2,
  Minimize2,
} from "lucide-react";
import type { SavedLocationContext } from "@/services/geo/locationContextSnapshot";
import { buildLocationContextFromDrawnGeometry } from "@/services/geo/locationContextSnapshot";
import {
  buildEffectiveForestCover,
  buildEffectiveSpeciesRows,
  mergeLocationContext,
  parseForestSurfaceHectares,
} from "@/services/geo/polygonAnalysisDisplay";
import { formatArea } from "@/services/format/areaFormat";
import { useAreaUnitStore } from "@/store/areaUnitStore";
import { savedPolyPillBtnOutline } from "@/components/map/saved/savedPolygonsUi";

interface SpeciesDistribution {
    species: string;
    areaHectares: number;
    percentage: number;
}

interface AnalysisResults {
    plotCount?: number;
    speciesDistribution?: SpeciesDistribution[];
    forestTypes?: string[];
    totalForestArea?: number;
    coveragePercentage?: number;
}

interface PolygonResult {
    id: string;
    name: string;
    areaHectares: number;
    analysisResults?: AnalysisResults | null;
    status: string;
    createdAt: string;
  locationContext?: Record<string, unknown> | null;
  geometry?: unknown;
}

interface PolygonResultsPanelProps {
    result: PolygonResult;
    onClose: () => void;
  /** Minimize to top dock (Windows-style). */
  onMinimize?: () => void;
  /** Refetch BD Forêt + admin layers at polygon centroid when opening (same as save snapshot). */
  mapRef?: RefObject<Map | null>;
  /** Extra classes on the outer card (e.g. width when docked). */
  rootClassName?: string;
  /** Attach to the teal header row to drag a floating panel (parent applies transform). */
  headerDragProps?: HTMLAttributes<HTMLDivElement>;
}

function formatKvLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/** Full-width card matching Forest parcel (BD Forêt) chrome */
function AdminBlock({
  title,
  icon: Icon,
  accent,
  props,
}: {
  title: string;
  icon: typeof Landmark;
  accent: "red" | "orange" | "blue";
  props: Record<string, unknown>;
}) {
  const exclude = new Set([
    "geom",
    "geometry",
    "the_geom",
    "wkb_geometry",
    "id",
    "ID",
  ]);
  const entries = Object.entries(props).filter(([k]) => !exclude.has(k));
  if (entries.length === 0) return null;
  const ring =
    accent === "red"
      ? "border-red-200 from-red-50 to-rose-50"
      : accent === "orange"
        ? "border-orange-200 from-orange-50 to-amber-50"
        : "border-blue-200 from-blue-50 to-indigo-50";
  const label =
    accent === "red"
      ? "text-red-600"
      : accent === "orange"
        ? "text-orange-600"
        : "text-blue-600";
  return (
    <div
      className={`w-full min-w-0 p-4 rounded-xl bg-gradient-to-br ${ring} border-2 shadow-sm`}
    >
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-black/5">
        <div
          className={`p-2 rounded-lg ${accent === "red" ? "bg-red-100" : accent === "orange" ? "bg-orange-100" : "bg-blue-100"}`}
        >
          <Icon size={22} className={label} />
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${label}`}>
            {title}
          </p>
        </div>
      </div>
      <div className="space-y-2 text-sm max-h-48 min-w-0 overflow-y-auto overflow-x-hidden">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className="grid min-w-0 grid-cols-1 gap-x-2 gap-y-0.5 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-start"
          >
            <span className={`font-medium min-w-0 break-words ${label}`}>
              {formatKvLabel(k)}:
            </span>
            <span className="text-gray-700 min-w-0 wrap-anywhere">
              {String(v ?? "—")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PolygonResultsPanel({
  result,
  onClose,
  onMinimize,
  mapRef,
  rootClassName = "",
  headerDragProps,
}: PolygonResultsPanelProps) {
  const { name, areaHectares, analysisResults, status, geometry } = result;
  const areaUnit = useAreaUnitStore((s) => s.areaUnit);
  const [resolvedLc, setResolvedLc] = useState<SavedLocationContext | null>(
    () => (result.locationContext as SavedLocationContext | undefined) ?? null,
  );
  const [wmsLoading, setWmsLoading] = useState(false);

  useEffect(() => {
    const saved =
      (result.locationContext as SavedLocationContext | undefined) ?? null;
    setResolvedLc(saved);

    const map = mapRef?.current;
    if (!map || !geometry || typeof geometry !== "object") {
      setWmsLoading(false);
      return;
    }

    let cancelled = false;
    setWmsLoading(true);
    (async () => {
      try {
        const fresh = await buildLocationContextFromDrawnGeometry(
          geometry as Record<string, unknown>,
          map,
        );
        if (cancelled) return;
        setResolvedLc(mergeLocationContext(saved, fresh));
      } catch {
        if (!cancelled) setResolvedLc(saved);
      } finally {
        if (!cancelled) setWmsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid refetch loop when Apollo refetches new object identity for locationContext
  }, [result.id, geometry, mapRef]);

  const lc = resolvedLc;
  const forestProps = (lc?.forest ?? null) as Record<string, unknown> | null;

  const parcelSurfaceHa = parseForestSurfaceHectares(forestProps);
  const forestClassBreakdown = lc?.forestClassBreakdown;
  const hasClassBreakdown = (forestClassBreakdown?.length ?? 0) > 0;
  const forestIntersectionHectares =
    lc?.forestIntersectionHectares != null &&
    Number.isFinite(lc.forestIntersectionHectares)
      ? lc.forestIntersectionHectares
      : null;

    const stats = analysisResults || {
        speciesDistribution: [],
        totalForestArea: 0,
        coveragePercentage: 0,
        plotCount: 0,
    forestTypes: [],
  };

  const effectiveSpecies = buildEffectiveSpeciesRows(
    stats.speciesDistribution,
    forestProps,
    areaHectares,
    parcelSurfaceHa,
    forestIntersectionHectares,
    forestClassBreakdown,
  );
  const sortedSpecies = [...effectiveSpecies].sort(
    (a, b) => b.areaHectares - a.areaHectares,
  );

  const forestMetrics = buildEffectiveForestCover(
    stats,
    forestProps,
    areaHectares,
    parcelSurfaceHa,
    forestIntersectionHectares,
    forestClassBreakdown,
  );
  const totalForestArea = forestMetrics.totalForestHa;
  const coveragePercentage = forestMetrics.coveragePct;
  const effectivePlotCount = forestMetrics.plotCount;

    const hasData = sortedSpecies.length > 0;

  const {
    className: headerDragClassName,
    ...headerDragRest
  } = headerDragProps ?? {};

    return (
    <div
      className={`bg-white rounded-xl shadow-2xl w-full min-w-0 h-full max-h-none flex flex-col overflow-x-hidden ${rootClassName}`}
    >
            {/* Header */}
      <div
        className={`p-4 bg-[#0b4a59] text-white flex items-start justify-between gap-3 shrink-0 rounded-t-xl min-w-0 ${headerDragClassName ?? ""}`}
        {...headerDragRest}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 bg-white/10 rounded-lg shrink-0">
                        <PieChart size={20} />
                    </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg break-words">{name}</h3>
            <p className="text-xs text-gray-300 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="break-words">
                Analysis Status:{" "}
                <span className="capitalize font-medium">{status}</span>
              </span>
              {wmsLoading && (
                <span className="inline-flex items-center gap-1 text-emerald-200 shrink-0">
                  <Loader2 size={12} className="animate-spin" />
                  Updating map layers…
                </span>
              )}
                        </p>
                    </div>
                </div>
        <div className="flex shrink-0 items-start gap-1">
          {onMinimize && (
            <button
              type="button"
              title="Minimize"
              aria-label="Minimize analysis"
              onClick={onMinimize}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white/95 shadow-sm backdrop-blur transition hover:bg-white/15 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <Minimize2 size={20} strokeWidth={2} />
            </button>
          )}
                <button
            type="button"
            title="Close"
            aria-label="Close analysis"
                    onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white/95 shadow-sm backdrop-blur transition hover:bg-white/15 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                >
                    <X size={20} />
                </button>
        </div>
            </div>

            {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
                {/* Summary Stats */}
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                            <Ruler size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">
                Total Area
              </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
              {formatArea(areaHectares, areaUnit)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                            <Trees size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">
                Forest Cover
              </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
              {formatArea(totalForestArea, areaUnit)}
                        </p>
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                            {coveragePercentage.toFixed(1)}% of polygon
                        </p>
            {forestIntersectionHectares != null && (
              <p className="text-[10px] text-emerald-800 mt-1 leading-snug">
                {hasClassBreakdown
                  ? "Overlap: union of your polygon ∩ all BD Forêt v2 parcels (WFS) in the area"
                  : "Overlap: your polygon ∩ BD Forêt parcel (from map geometries)"}
              </p>
            )}
            {parcelSurfaceHa != null && forestIntersectionHectares == null && (
              <p className="text-[10px] text-emerald-700/80 mt-1">
                BD parcel surface ~{formatArea(parcelSurfaceHa, areaUnit)}
              </p>
            )}
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                            <Leaf size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">
                {hasClassBreakdown ? "TFV classes" : "Species"}
              </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {sortedSpecies.length}
                        </p>
                        <p className="text-xs text-amber-600 font-medium mt-1">
              {hasClassBreakdown
                ? `${effectivePlotCount} parcel${effectivePlotCount === 1 ? "" : "s"} (WFS)`
                : `${effectivePlotCount} forest plot${effectivePlotCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {/* WMS snapshot — full-width blocks */}
        {lc &&
          (lc.region || lc.department || lc.commune) && (
            <div className="space-y-3 w-full">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Trees size={18} className="text-emerald-600" />
                Location snapshot (BD Forêt & admin)
              </h4>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Trees size={20} className="text-[#0b4a59]" />
                    <h4 className="font-semibold text-gray-900">
                      Location snapshot (BD Forêt & admin)
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 pl-7">
                    {hasClassBreakdown
                      ? "Forest card: sample at polygon centroid. Coverage and class list use full polygon overlap (BD Forêt v2 WFS)."
                      : "Details captured at the polygon centroid."}
                  </p>
                </div>

                <div className="space-y-3">
                  {lc.region && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-[#0b4a59] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                            <Landmark size={16} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-gray-900 truncate">
                              Region
                            </h5>
                            <p className="text-xs text-gray-500 truncate">
                              Administrative
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm max-h-48 min-w-0 overflow-y-auto overflow-x-hidden">
                        {Object.entries(lc.region).map(([k, v]) => (
                          <div key={k} className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-600 shrink-0">
                              {formatKvLabel(k)}
                            </span>
                            <span className="text-xs text-gray-800 break-words text-right">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {lc.department && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-[#0b4a59] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-gray-900 truncate">
                              Department
                            </h5>
                            <p className="text-xs text-gray-500 truncate">
                              Administrative
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm max-h-48 min-w-0 overflow-y-auto overflow-x-hidden">
                        {Object.entries(lc.department).map(([k, v]) => (
                          <div key={k} className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-600 shrink-0">
                              {formatKvLabel(k)}
                            </span>
                            <span className="text-xs text-gray-800 break-words text-right">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {lc.commune && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-[#0b4a59] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                            <Home size={16} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-gray-900 truncate">
                              Commune
                            </h5>
                            <p className="text-xs text-gray-500 truncate">
                              Administrative
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm max-h-48 min-w-0 overflow-y-auto overflow-x-hidden">
                        {Object.entries(lc.commune).map(([k, v]) => (
                          <div key={k} className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-600 shrink-0">
                              {formatKvLabel(k)}
                            </span>
                            <span className="text-xs text-gray-800 break-words text-right">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {typeof lc.sampleLng === "number" && typeof lc.sampleLat === "number" && (
                  <p className="mt-3 text-[10px] text-gray-400 font-mono">
                    Sample point: {lc.sampleLat.toFixed(5)}, {lc.sampleLng.toFixed(5)} (polygon centroid)
                  </p>
                )}
              </div>
            </div>
          )}

                {stats.forestTypes && stats.forestTypes.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Forest Types Found
            </h4>
                        <div className="flex flex-wrap gap-2">
                            {stats.forestTypes.map((type, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1.5 bg-[#0b4a59]/10 text-[#0b4a59] text-xs rounded-full font-medium border border-[#0b4a59]/20"
                                >
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

        {/* Tree Species Distribution */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="mb-4">
            <div className="flex items-center gap-2">
                        <BarChart3 size={20} className="text-[#0b4a59]" />
              <h4 className="font-semibold text-gray-900">
                Tree species & forest type
              </h4>
            </div>
            <p className="mt-1 text-xs text-gray-500 pl-7">
              {hasClassBreakdown ? (
                <>
                  Rows are <span className="font-medium">BD Forêt v2 TFV classes</span>{" "}
                  under your polygon (intersection areas from WFS). Percentages are shares
                  of total forest overlap.
                </>
              ) : (
                <>
                  Rows from BD Forêt <span className="font-medium">essence</span> when
                  present, otherwise <span className="font-medium">forest type (TFV)</span>.
                  Areas follow your overlap with the parcel (or saved analysis).
                </>
              )}
            </p>
                    </div>

                    {!hasData ? (
                        <div className="text-center py-8">
                            <Trees size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                No forest species data for this polygon
              </p>
              {status === "pending" && (
                                <p className="text-xs text-amber-600 mt-2">
                                    Forest data may still be loading. Try reanalyzing later.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
              {sortedSpecies.map((species, index) => {
                const pct = Number(species.percentage ?? 0);
                return (
                                <div
                                    key={`${species.species}-${index}`}
                                    className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#0b4a59] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h5 className="font-semibold text-gray-900">
                                                    {species.species}
                                                </h5>
                                                <p className="text-xs text-gray-500">
                            {pct.toFixed(1)}% of forest cover (estimated)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-600">
                          {formatArea(species.areaHectares, areaUnit)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 ml-11">
                                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#0b4a59] to-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                          }}
                                            />
                                        </div>
                                    </div>
                                </div>
                );
              })}
                        </div>
                    )}
                </div>

                {hasData && (
                    <div className="bg-[#0b4a59]/5 rounded-xl p-4 border border-[#0b4a59]/20">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">
                  {hasClassBreakdown ? "TFV classes:" : "Total Species:"}
                </span>
                <span className="font-semibold text-[#0b4a59]">
                  {sortedSpecies.length}
                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">
                  {hasClassBreakdown ? "WFS parcels:" : "Forest Plots:"}
                </span>
                <span className="font-semibold text-[#0b4a59]">
                  {effectivePlotCount}
                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Non-Forest Area:</span>
                                <span className="font-semibold text-gray-700">
                  {formatArea(
                    Math.max(0, areaHectares - totalForestArea),
                    areaUnit,
                  )}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Analysis Date:</span>
                                <span className="font-semibold text-gray-700">
                                    {new Date(result.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

      {/* Footer intentionally omitted (close button is in header) */}
        </div>
    );
}
