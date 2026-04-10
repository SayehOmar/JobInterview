'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { normalizeLayerColorToHex, WMSLayerConfig } from '@/services/wmsLayers';
import { mapDropdownHeaderClass, mapDropdownPanelClass } from './mapDropdownStyles';

const PICKER_W = 232;
const PICKER_H = 268;

interface LayerControlPanelProps {
    layers: WMSLayerConfig[];
    onToggleLayer: (layerId: string) => void;
    onLayerColorChange: (layerId: string, color: string) => void;
    currentZoom: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LayerControlPanel({
    layers,
    onToggleLayer,
    onLayerColorChange,
    currentZoom,
    open,
    onOpenChange,
}: LayerControlPanelProps) {
    const [colorPickerId, setColorPickerId] = useState<string | null>(null);
    const [pickerPos, setPickerPos] = useState<{ left: number; top: number } | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const isVisible = (layer: WMSLayerConfig) => {
        return layer.visible && currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;
    };

    useEffect(() => {
        if (!open) {
            setColorPickerId(null);
            setPickerPos(null);
        }
    }, [open]);

    useEffect(() => {
        if (!colorPickerId) return;
        const onDoc = (e: MouseEvent) => {
            if (pickerRef.current?.contains(e.target as Node)) return;
            setColorPickerId(null);
            setPickerPos(null);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [colorPickerId]);

    useEffect(() => {
        if (!colorPickerId) return;
        const onScroll = () => {
            setColorPickerId(null);
            setPickerPos(null);
        };
        window.addEventListener('scroll', onScroll, true);
        return () => window.removeEventListener('scroll', onScroll, true);
    }, [colorPickerId]);

    return (
        <div className="flex w-full flex-col items-end">
            <button
                type="button"
                aria-expanded={open}
                aria-label="WMS layers"
                onClick={() => onOpenChange(!open)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 active:scale-[0.98] ${
                    open ? 'ring-2 ring-[#0b4a59] ring-offset-2' : ''
                }`}
            >
                <Layers size={22} className="text-[#0b4a59]" strokeWidth={2} />
            </button>

            {open && (
                <div className={`${mapDropdownPanelClass} mt-2 w-full overflow-visible`}>
                    <div className={mapDropdownHeaderClass}>
                        <Layers size={18} className="shrink-0 text-[#0b4a59]" />
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">Map layers</h3>
                            <p className="text-xs text-gray-500">Visibility and legend colors</p>
                        </div>
                    </div>
                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                        Zoom: {currentZoom.toFixed(1)}
                    </div>
                    <div className="max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain py-1">
                        {layers.map((layer) => {
                            const hex = normalizeLayerColorToHex(layer.color || '#888888');
                            return (
                                <div
                                    key={layer.id}
                                    className="relative flex items-center justify-between gap-1 border-b border-gray-100 px-2 py-1.5 last:border-0 hover:bg-gray-50"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <button
                                            type="button"
                                            title="Change color"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const next =
                                                    colorPickerId === layer.id ? null : layer.id;
                                                setColorPickerId(next);
                                                if (next) {
                                                    const r = e.currentTarget.getBoundingClientRect();
                                                    const gap = 8;
                                                    // Panel opens to the **left** of the color dot, vertically centered.
                                                    let left = r.left - PICKER_W - gap;
                                                    left = Math.max(gap, Math.min(left, window.innerWidth - PICKER_W - gap));
                                                    let top = r.top + r.height / 2 - PICKER_H / 2;
                                                    top = Math.max(gap, Math.min(top, window.innerHeight - PICKER_H - gap));
                                                    setPickerPos({ left, top });
                                                } else {
                                                    setPickerPos(null);
                                                }
                                            }}
                                            className="relative h-5 w-5 shrink-0 rounded-full border border-gray-200 shadow-inner ring-2 ring-white transition hover:scale-110"
                                            style={{ backgroundColor: layer.color || hex }}
                                        />
                                        <span
                                            className={`truncate text-xs ${isVisible(layer) ? 'text-gray-900' : 'text-gray-400'}`}
                                        >
                                            {layer.name}
                                        </span>
                                        <span className="shrink-0 text-[8px] text-gray-400">
                                            z{layer.minZoom}-{layer.maxZoom}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onToggleLayer(layer.id)}
                                        className={`shrink-0 rounded-md p-1 ${layer.visible ? 'text-[#0b4a59]' : 'text-gray-300'}`}
                                    >
                                        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {colorPickerId &&
                pickerPos &&
                typeof document !== 'undefined' &&
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
                                        '#888888',
                                )}
                                onChange={(c) => onLayerColorChange(colorPickerId, c)}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
