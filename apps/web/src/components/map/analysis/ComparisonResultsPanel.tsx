"use client";

import { useEffect, useMemo, useState, type HTMLAttributes, type RefObject } from "react";
import type { Map } from "mapbox-gl";
import { X, Minimize2, Ruler, Trees, Leaf, Scale } from "lucide-react";
import type { SavedLocationContext } from "@/services/geo/locationContextSnapshot";
import { computePolygonAnalysis, refreshLocationContextForGeometry } from "@/services/domains/polygonAnalysis";
import { formatArea } from "@/services/format/areaFormat";
import { useAreaUnitStore } from "@/store/areaUnitStore";

type PolygonRow = {
  id: string;
  name: string;
  areaHectares: number;
  status: string;
  createdAt: string;
  analysisResults?: {
    plotCount?: number;
    speciesDistribution?: { species: string; areaHectares: number; percentage: number }[];
    totalForestArea?: number;
    coveragePercentage?: number;
  } | null;
  locationContext?: Record<string, unknown> | null;
  geometry?: unknown;
};

export type ComparisonAnalysisResult = {
  kind: "comparison";
  id: string;
  name: string;
  status: "completed" | "pending";
  createdAt: string;
  a: PolygonRow;
  b: PolygonRow;
};

export function ComparisonResultsPanel({
  result,
  onClose,
  onMinimize,
  mapRef,
  rootClassName = "",
  headerDragProps,
}: {
  result: ComparisonAnalysisResult;
  onClose: () => void;
  onMinimize?: () => void;
  mapRef?: RefObject<Map | null>;
  rootClassName?: string;
  headerDragProps?: HTMLAttributes<HTMLDivElement>;
}) {
  const areaUnit = useAreaUnitStore((s) => s.areaUnit);

  const [lcA, setLcA] = useState<SavedLocationContext | null>(
    () => (result.a.locationContext as SavedLocationContext | undefined) ?? null,
  );
  const [lcB, setLcB] = useState<SavedLocationContext | null>(
    () => (result.b.locationContext as SavedLocationContext | undefined) ?? null,
  );

  useEffect(() => {
    const map = mapRef?.current;
    if (!map) return;

    let cancelled = false;
    (async () => {
      try {
        if (result.a.geometry && typeof result.a.geometry === "object") {
          const saved = (result.a.locationContext as SavedLocationContext | undefined) ?? null;
          const fresh = await refreshLocationContextForGeometry(
            result.a.geometry as Record<string, unknown>,
            map,
            saved,
          );
          if (!cancelled) setLcA(fresh);
        }
        if (result.b.geometry && typeof result.b.geometry === "object") {
          const saved = (result.b.locationContext as SavedLocationContext | undefined) ?? null;
          const fresh = await refreshLocationContextForGeometry(
            result.b.geometry as Record<string, unknown>,
            map,
            saved,
          );
          if (!cancelled) setLcB(fresh);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapRef, result.a.id, result.b.id, result.a.geometry, result.b.geometry, result.a.locationContext, result.b.locationContext]);

  const metricsA = useMemo(() => {
    const computed = computePolygonAnalysis({
      polygonAreaHa: result.a.areaHectares,
      analysisResults: result.a.analysisResults ?? null,
      locationContext: lcA,
    });
    return { forest: computed.forest, species: computed.rows };
  }, [lcA, result.a]);

  const metricsB = useMemo(() => {
    const computed = computePolygonAnalysis({
      polygonAreaHa: result.b.areaHectares,
      analysisResults: result.b.analysisResults ?? null,
      locationContext: lcB,
    });
    return { forest: computed.forest, species: computed.rows };
  }, [lcB, result.b]);

  const diff = useMemo(() => {
    const areaDelta = result.b.areaHectares - result.a.areaHectares;
    const forestDelta = metricsB.forest.totalForestHa - metricsA.forest.totalForestHa;
    const pctDelta = metricsB.forest.coveragePct - metricsA.forest.coveragePct;
    return { areaDelta, forestDelta, pctDelta };
  }, [metricsA, metricsB, result.a.areaHectares, result.b.areaHectares]);

  const { className: headerDragClassName, ...headerDragRest } = headerDragProps ?? {};

  return (
    <div
      className={`bg-white rounded-xl shadow-2xl w-full min-w-0 h-full max-h-none flex flex-col overflow-x-hidden ${rootClassName}`}
    >
      <div
        className={`p-4 bg-[#0b4a59] text-white flex items-start justify-between gap-3 shrink-0 rounded-t-xl min-w-0 ${headerDragClassName ?? ""}`}
        {...headerDragRest}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 bg-white/10 rounded-lg shrink-0">
            <Scale size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg break-words">{result.name}</h3>
            <p className="text-xs text-gray-300 mt-1">
              Comparing <span className="font-semibold text-white/90">{result.a.name}</span> vs{" "}
              <span className="font-semibold text-white/90">{result.b.name}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          {onMinimize && (
            <button
              type="button"
              title="Minimize"
              aria-label="Minimize comparison"
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
            aria-label="Close comparison"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white/95 shadow-sm backdrop-blur transition hover:bg-white/15 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Ruler size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">Area</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-gray-500 truncate">{result.a.name}</p>
                <p className="text-lg font-bold text-gray-900">{formatArea(result.a.areaHectares, areaUnit)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-gray-500 truncate">{result.b.name}</p>
                <p className="text-lg font-bold text-gray-900">{formatArea(result.b.areaHectares, areaUnit)}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Δ Area:{" "}
              <span className="font-semibold">
                {diff.areaDelta >= 0 ? "+" : ""}
                {formatArea(Math.abs(diff.areaDelta), areaUnit)}
              </span>
            </p>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800 mb-2">
              <Trees size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">Forest overlap</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-emerald-700 truncate">{result.a.name}</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatArea(metricsA.forest.totalForestHa, areaUnit)}
                </p>
                <p className="text-[11px] text-emerald-700/90">
                  {metricsA.forest.coveragePct.toFixed(1)}% of polygon
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-emerald-700 truncate">{result.b.name}</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatArea(metricsB.forest.totalForestHa, areaUnit)}
                </p>
                <p className="text-[11px] text-emerald-700/90">
                  {metricsB.forest.coveragePct.toFixed(1)}% of polygon
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-emerald-900/80">
              Δ Forest:{" "}
              <span className="font-semibold">
                {diff.forestDelta >= 0 ? "+" : ""}
                {formatArea(Math.abs(diff.forestDelta), areaUnit)}
              </span>{" "}
              ({diff.pctDelta >= 0 ? "+" : ""}
              {diff.pctDelta.toFixed(1)}%)
            </p>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <Leaf size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">Classes</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-amber-700 truncate">{result.a.name}</p>
                <p className="text-lg font-bold text-gray-900">{metricsA.species.length}</p>
                <p className="text-[11px] text-amber-700/90">TFV classes (WFS)</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-amber-700 truncate">{result.b.name}</p>
                <p className="text-lg font-bold text-gray-900">{metricsB.species.length}</p>
                <p className="text-[11px] text-amber-700/90">TFV classes (WFS)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 truncate">{result.a.name} — TFV classes</h4>
            {metricsA.species.length === 0 ? (
              <p className="text-sm text-gray-500">No class breakdown available.</p>
            ) : (
              <div className="space-y-2">
                {metricsA.species.slice(0, 12).map((r, i) => (
                  <div key={`${r.species}-${i}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.species}</p>
                      <p className="text-xs text-gray-600 shrink-0">{r.percentage.toFixed(1)}%</p>
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5">{formatArea(r.areaHectares, areaUnit)}</p>
                  </div>
                ))}
                {metricsA.species.length > 12 && (
                  <p className="text-xs text-gray-500">…and {metricsA.species.length - 12} more</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 truncate">{result.b.name} — TFV classes</h4>
            {metricsB.species.length === 0 ? (
              <p className="text-sm text-gray-500">No class breakdown available.</p>
            ) : (
              <div className="space-y-2">
                {metricsB.species.slice(0, 12).map((r, i) => (
                  <div key={`${r.species}-${i}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.species}</p>
                      <p className="text-xs text-gray-600 shrink-0">{r.percentage.toFixed(1)}%</p>
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5">{formatArea(r.areaHectares, areaUnit)}</p>
                  </div>
                ))}
                {metricsB.species.length > 12 && (
                  <p className="text-xs text-gray-500">…and {metricsB.species.length - 12} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

