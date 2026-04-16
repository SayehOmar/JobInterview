"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HexColorPicker } from "react-colorful";
import { Layers, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import {
  normalizeLayerColorToHex,
  WMSLayerConfig,
} from "@/services/geo/wms/wmsLayers";
import {
  BD_FORET_V2_TFV_LABELS,
  defaultColorForTfv,
  type BdForetV2TfvColorMap,
  type BdForetV2TfvVisibilityMap,
} from "@/services/geo/bdForetV2/bdForetV2TfvColors";
import {
  mapDropdownHeaderClass,
  mapDropdownPanelClass,
} from "../mapDropdownStyles";
import {
  savedPolyRoundBtnMuted,
  savedPolyRoundBtnTeal,
} from "../saved/savedPolygonsUi";

const PICKER_W = 232;
const PICKER_H = 268;
const LEGEND_W = 320;
const LEGEND_H = 260;

interface LayerControlPanelProps {
  layers: WMSLayerConfig[];
  onToggleLayer: (layerId: string) => void;
  onLayerColorChange: (layerId: string, color: string) => void;
  bdForetV2TfvColors?: BdForetV2TfvColorMap;
  onBdForetV2TfvColorChange?: (tfv: string, color: string) => void;
  bdForetV2TfvVisibility?: BdForetV2TfvVisibilityMap;
  onBdForetV2TfvVisibilityChange?: (tfv: string, visible: boolean) => void;
  currentZoom: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LayerControlPanel({
  layers,
  onToggleLayer,
  onLayerColorChange,
  bdForetV2TfvColors,
  onBdForetV2TfvColorChange,
  bdForetV2TfvVisibility,
  onBdForetV2TfvVisibilityChange,
  currentZoom,
  open,
  onOpenChange,
}: LayerControlPanelProps) {
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [legendLayerId, setLegendLayerId] = useState<string | null>(null);
  const [legendPos, setLegendPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const legendRef = useRef<HTMLDivElement>(null);
  const [bdv2TfvEditing, setBdv2TfvEditing] = useState<string | null>(null);
  const [bdv2Search, setBdv2Search] = useState("");

  const bdv2Colors = bdForetV2TfvColors ?? {};
  const bdv2Visibility = bdForetV2TfvVisibility ?? {};
  const isBdForetV2LegendOpen = legendLayerId === "bd_foret_v2_polygons";
  const editingColor = bdv2TfvEditing
    ? normalizeLayerColorToHex(bdv2Colors[bdv2TfvEditing] ?? defaultColorForTfv(bdv2TfvEditing))
    : "#22c55e";

  const bdv2PickerPos = useMemo(() => {
    if (!isBdForetV2LegendOpen || !bdv2TfvEditing || !legendPos) return null;
    const gap = 8;
    let left = legendPos.left - PICKER_W - gap;
    left = Math.max(gap, Math.min(left, window.innerWidth - PICKER_W - gap));
    let top = legendPos.top + 40; // align roughly under legend header
    top = Math.max(gap, Math.min(top, window.innerHeight - PICKER_H - gap));
    return { left, top };
  }, [isBdForetV2LegendOpen, bdv2TfvEditing, legendPos]);

  const bdv2LegendRows = useMemo(
    () =>
      BD_FORET_V2_TFV_LABELS.map((tfv) => ({
        tfv,
        color: normalizeLayerColorToHex(bdv2Colors[tfv] ?? defaultColorForTfv(tfv)),
        visible: bdv2Visibility[tfv] !== false,
      })),
    [bdv2Colors, bdv2Visibility],
  );

  const filteredBdv2Rows = useMemo(() => {
    const q = bdv2Search.trim().toLowerCase();
    if (!q) return bdv2LegendRows;
    return bdv2LegendRows.filter((r) => r.tfv.toLowerCase().includes(q));
  }, [bdv2LegendRows, bdv2Search]);

  const isVisible = (layer: WMSLayerConfig) => {
    return (
      layer.visible &&
      currentZoom >= layer.minZoom &&
      currentZoom <= layer.maxZoom
    );
  };

  useEffect(() => {
    if (!open) {
      setColorPickerId(null);
      setPickerPos(null);
      setLegendLayerId(null);
      setLegendPos(null);
      setBdv2TfvEditing(null);
    }
  }, [open]);

  useEffect(() => {
    if (!colorPickerId && !legendLayerId) return;
    const onDoc = (e: MouseEvent) => {
      if (pickerRef.current?.contains(e.target as Node)) return;
      if (legendRef.current?.contains(e.target as Node)) return;
      setColorPickerId(null);
      setPickerPos(null);
      setLegendLayerId(null);
      setLegendPos(null);
      setBdv2TfvEditing(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [colorPickerId, legendLayerId]);

  useEffect(() => {
    if (!colorPickerId && !legendLayerId) return;
    const onScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && pickerRef.current?.contains(target)) return;
      if (target && legendRef.current?.contains(target)) return;
      setColorPickerId(null);
      setPickerPos(null);
      setLegendLayerId(null);
      setLegendPos(null);
      setBdv2TfvEditing(null);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [colorPickerId, legendLayerId]);

  return (
    <div className="flex w-full flex-col items-end">
      <button
        type="button"
        aria-expanded={open}
        aria-label="WMS layers"
        onClick={() => onOpenChange(!open)}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 active:scale-[0.98] ${
          open ? "ring-2 ring-[#0b4a59] ring-offset-2" : ""
        }`}
      >
        <Layers size={22} className="text-[#0b4a59]" strokeWidth={2} />
      </button>

      {open && (
        <div
          className={`${mapDropdownPanelClass} mt-2 w-full overflow-visible`}
        >
          <div className={mapDropdownHeaderClass}>
            <Layers size={18} className="shrink-0 text-[#0b4a59]" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Map layers
              </h3>
              <p className="text-xs text-gray-500">
                Visibility and legend colors
              </p>
            </div>
          </div>
          <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
            Zoom: {currentZoom.toFixed(1)}
          </div>
          <div className="max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain py-1">
            {layers.map((layer) => {
              const hex = normalizeLayerColorToHex(layer.color || "#888888");
              const legendUrl = layer.legendUrl;
              const isBdv2 = layer.id === "bd_foret_v2_polygons";
              return (
                <div
                  key={layer.id}
                  className="relative flex items-center justify-between gap-1 border-b border-gray-100 px-2 py-1.5 last:border-0 hover:bg-gray-50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {isBdv2 ? (
                      <button
                        type="button"
                        title="Classes legend"
                        aria-label="Open BD Forêt v2 classes legend"
                        className={savedPolyRoundBtnMuted}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next =
                            legendLayerId === layer.id ? null : layer.id;
                          setLegendLayerId(next);
                          if (next) {
                            const r = e.currentTarget.getBoundingClientRect();
                            const gap = 8;
                            let left = r.left - LEGEND_W - gap;
                            left = Math.max(
                              gap,
                              Math.min(left, window.innerWidth - LEGEND_W - gap),
                            );
                            let top = r.top + r.height / 2 - LEGEND_H / 2;
                            top = Math.max(
                              gap,
                              Math.min(top, window.innerHeight - LEGEND_H - gap),
                            );
                            setLegendPos({ left, top });
                          } else {
                            setLegendPos(null);
                          }
                        }}
                      >
                        <ImageIcon size={15} strokeWidth={2} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Change color"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = colorPickerId === layer.id ? null : layer.id;
                          setColorPickerId(next);
                          if (next) {
                            const r = e.currentTarget.getBoundingClientRect();
                            const gap = 8;
                            // Panel opens to the **left** of the color dot, vertically centered.
                            let left = r.left - PICKER_W - gap;
                            left = Math.max(
                              gap,
                              Math.min(left, window.innerWidth - PICKER_W - gap),
                            );
                            let top = r.top + r.height / 2 - PICKER_H / 2;
                            top = Math.max(
                              gap,
                              Math.min(top, window.innerHeight - PICKER_H - gap),
                            );
                            setPickerPos({ left, top });
                          } else {
                            setPickerPos(null);
                          }
                        }}
                        className="relative h-5 w-5 shrink-0 rounded-full border border-gray-200 shadow-inner ring-2 ring-white transition hover:scale-110"
                        style={{ backgroundColor: layer.color || hex }}
                      />
                    )}
                    <span
                      className={`truncate text-xs ${isVisible(layer) ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {layer.name}
                    </span>
                    <span className="shrink-0 text-[8px] text-gray-400">
                      z{layer.minZoom}-{layer.maxZoom}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {legendUrl && !isBdv2 && (
                      <button
                        type="button"
                        title="Legend"
                        aria-label={`Show legend for ${layer.name}`}
                        className={savedPolyRoundBtnMuted}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next =
                            legendLayerId === layer.id ? null : layer.id;
                          setLegendLayerId(next);
                          if (next) {
                            const r = e.currentTarget.getBoundingClientRect();
                            const gap = 8;
                            let left = r.left - LEGEND_W - gap;
                            left = Math.max(
                              gap,
                              Math.min(left, window.innerWidth - LEGEND_W - gap),
                            );
                            let top = r.top + r.height / 2 - LEGEND_H / 2;
                            top = Math.max(
                              gap,
                              Math.min(top, window.innerHeight - LEGEND_H - gap),
                            );
                            setLegendPos({ left, top });
                          } else {
                            setLegendPos(null);
                          }
                        }}
                      >
                        <ImageIcon size={15} strokeWidth={2} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleLayer(layer.id)}
                      className={
                        layer.visible ? savedPolyRoundBtnTeal : savedPolyRoundBtnMuted
                      }
                      aria-label={layer.visible ? "Hide layer" : "Show layer"}
                      title={layer.visible ? "Hide layer" : "Show layer"}
                    >
                      {layer.visible ? (
                        <Eye size={15} strokeWidth={2} />
                      ) : (
                        <EyeOff size={15} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {colorPickerId &&
        pickerPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-100 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
            style={{ left: pickerPos.left, top: pickerPos.top }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Color
            </p>
            <div className="react-colorful-wheel-wrap">
              <HexColorPicker
                color={normalizeLayerColorToHex(
                  layers.find((l) => l.id === colorPickerId)?.color ||
                    "#888888",
                )}
                onChange={(c) => onLayerColorChange(colorPickerId, c)}
              />
            </div>
          </div>,
          document.body,
        )}

      {legendLayerId &&
        legendPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={legendRef}
            className="fixed z-100 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
            style={{ left: legendPos.left, top: legendPos.top }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Legend
              </p>
            </div>
            {isBdForetV2LegendOpen && onBdForetV2TfvColorChange ? (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-600">
                  Click a class to edit its color.
                </p>
                <input
                  type="text"
                  value={bdv2Search}
                  onChange={(e) => setBdv2Search(e.target.value)}
                  placeholder="Search class..."
                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-[#0b4a59]/20"
                />
                <div className="max-h-[160px] overflow-auto rounded-lg border border-gray-100 bg-gray-50">
                  {filteredBdv2Rows.map((row) => (
                    <button
                      key={row.tfv}
                      type="button"
                      onClick={() =>
                        setBdv2TfvEditing((cur) => (cur === row.tfv ? null : row.tfv))
                      }
                      className="flex w-full items-center gap-2 border-b border-gray-100 px-2 py-1.5 text-left text-[12px] hover:bg-white last:border-0"
                      title={row.tfv}
                    >
                      <input
                        type="checkbox"
                        checked={row.visible}
                        onChange={(e) => {
                          e.stopPropagation();
                          onBdForetV2TfvVisibilityChange?.(
                            row.tfv,
                            e.currentTarget.checked,
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 shrink-0"
                        title={row.visible ? "Hide class" : "Show class"}
                      />
                      <span
                        className="h-4 w-4 shrink-0 rounded-sm border border-black/10"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="min-w-0 flex-1 truncate">{row.tfv}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-h-[220px] overflow-auto rounded-lg border border-gray-100 bg-gray-50 p-2">
                {/* Legend images come from GeoPF capabilities */}
                <img
                  src={layers.find((l) => l.id === legendLayerId)?.legendUrl || ""}
                  alt={`Legend for ${layers.find((l) => l.id === legendLayerId)?.name ?? "layer"}`}
                  className="h-auto w-full"
                  loading="lazy"
                />
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* BD Forêt v2 class color wheel — separate window left of legend */}
      {isBdForetV2LegendOpen &&
        bdv2TfvEditing &&
        bdv2PickerPos &&
        typeof document !== "undefined" &&
        onBdForetV2TfvColorChange &&
        createPortal(
          <div
            className="fixed z-100 w-[232px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
            style={{ left: bdv2PickerPos.left, top: bdv2PickerPos.top }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              {bdv2TfvEditing}
            </p>
            <div className="react-colorful-wheel-wrap">
              <HexColorPicker
                color={editingColor}
                onChange={(c) => onBdForetV2TfvColorChange(bdv2TfvEditing, c)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
