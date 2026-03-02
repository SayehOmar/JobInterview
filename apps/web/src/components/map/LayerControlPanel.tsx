// components/LayerControlPanel.tsx
'use client';

import { useState } from 'react';
import { Layers, Eye, EyeOff, Pencil } from 'lucide-react';
import { WMSLayerConfig } from '@/services/wmsLayers';

interface LayerControlPanelProps {
    layers: WMSLayerConfig[];
    onToggleLayer: (layerId: string) => void;
    currentZoom: number;
    onDrawStart?: () => void; // ADD THIS
    isDrawing?: boolean; // ADD THIS
}

export function LayerControlPanel({
                                      layers,
                                      onToggleLayer,
                                      currentZoom,
                                      onDrawStart,
                                      isDrawing
                                  }: LayerControlPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isVisible = (layer: WMSLayerConfig) => {
        return layer.visible && currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;
    };

    return (
        <div className="absolute top-20 right-4 z-10">
            {/* Draw Polygon Button - SEPARATE FROM LAYERS */}
            <button
                onClick={onDrawStart}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded shadow border text-xs font-medium transition-colors mb-2 ${
                    isDrawing
                        ? 'bg-[#0b4a59] text-white border-[#0b4a59]'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
            >
                <Pencil size={14} />
                {isDrawing ? 'Drawing...' : 'Draw Polygon'}
            </button>

            {/* Layers Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded shadow border text-xs font-medium transition-colors ${
                    isExpanded ? 'bg-[#0b4a59] text-white border-[#0b4a59]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
            >
                <Layers size={14} />
                Layers
            </button>

            {isExpanded && (
                <div className="mt-1 w-56 bg-white rounded shadow-lg border border-gray-200">
                    <div className="px-2 py-1 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                        Zoom: {currentZoom.toFixed(1)}
                    </div>
                    <div>
                        {layers.map((layer) => (
                            <div
                                key={layer.id}
                                className="flex items-center justify-between px-1 py-1 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{backgroundColor: layer.color}}
                                    />
                                    <span
                                        className={`text-xs truncate ${isVisible(layer) ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {layer.name}
                                    </span>
                                    <span className="text-[8px] text-gray-400">
                                        At Zoom: {layer.minZoom}-{layer.maxZoom}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onToggleLayer(layer.id)}
                                    className={`shrink-0 ${layer.visible ? 'text-[#0b4a59]' : 'text-gray-300'}`}
                                >
                                    {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}