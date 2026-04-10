'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Settings,
    Pencil,
    Pentagon,
    Trash2,
    Map as MapIcon,
    Satellite,
    Mountain,
    Sun,
    Moon,
    Layers,
} from 'lucide-react';

type BaseLayerKey = 'satellite' | 'streets' | 'terrain' | 'light' | 'dark';

const BASE_META: Record<BaseLayerKey, { label: string; icon: typeof Satellite }> = {
    satellite: { label: 'Satellite', icon: Satellite },
    streets: { label: 'Streets', icon: MapIcon },
    terrain: { label: 'Terrain', icon: Mountain },
    light: { label: 'Light', icon: Sun },
    dark: { label: 'Dark', icon: Moon },
};

interface MapFloatingControlsProps {
    onDrawStart: () => void;
    /** MapboxDraw polygon tool — draw another / edit (only shown when a polygon exists on the map). */
    onDrawPolygonTool: () => void;
    /** Clear drawn features (only shown when a polygon exists on the map). */
    onDrawDelete: () => void;
    /** True when MapboxDraw has at least one feature (shows polygon + trash in gear). */
    hasPolygonOnMap?: boolean;
    isDrawing: boolean;
    baseLayer: BaseLayerKey;
    onBaseLayerChange: (key: BaseLayerKey) => void;
    showCadastre: boolean;
    onToggleCadastre: () => void;
}

export function MapFloatingControls({
    onDrawStart,
    onDrawPolygonTool,
    onDrawDelete,
    hasPolygonOnMap = false,
    isDrawing,
    baseLayer,
    onBaseLayerChange,
    showCadastre,
    onToggleCadastre,
}: MapFloatingControlsProps) {
    const [gearOpen, setGearOpen] = useState(false);
    const gearDockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!gearDockRef.current?.contains(t)) {
                setGearOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    return (
        <>
            {/* Gear dock — bottom center: low opacity until hover; opens as one wide pill with inner circles */}
            <div
                ref={gearDockRef}
                className={`pointer-events-auto fixed bottom-6 left-1/2 z-30 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 justify-center transition-opacity duration-500 ease-out ${
                    gearOpen ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                }`}
            >
                <div
                    className={`flex flex-row items-center justify-center border border-gray-200/90 bg-white/95 shadow-lg backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        gearOpen
                            ? 'gap-2 rounded-[50px] px-3 py-2'
                            : 'h-12 w-12 rounded-full p-0'
                    }`}
                >
                    {gearOpen && (
                        <div className="animate-gear-open flex flex-row items-center justify-center gap-2">
                            <CircleTool
                                title={isDrawing ? 'Drawing…' : 'Draw polygon'}
                                active={isDrawing}
                                onClick={() => onDrawStart()}
                            >
                                <Pencil size={18} className="text-[#0b4a59]" strokeWidth={2} />
                            </CircleTool>

                            {hasPolygonOnMap && (
                                <>
                                    <CircleTool
                                        title="Polygon tool"
                                        active={isDrawing}
                                        onClick={() => onDrawPolygonTool()}
                                    >
                                        <Pentagon size={18} className="text-[#0b4a59]" strokeWidth={2} />
                                    </CircleTool>
                                    <CircleTool title="Delete drawing" onClick={() => onDrawDelete()}>
                                        <Trash2 size={18} className="text-red-600" strokeWidth={2} />
                                    </CircleTool>
                                </>
                            )}

                            {(Object.keys(BASE_META) as BaseLayerKey[]).map((key) => {
                                const { label, icon: Icon } = BASE_META[key];
                                const active = baseLayer === key;
                                return (
                                    <CircleTool
                                        key={key}
                                        title={label}
                                        active={active}
                                        onClick={() => onBaseLayerChange(key)}
                                    >
                                        <Icon size={18} className={active ? 'text-[#0b4a59]' : 'text-gray-700'} strokeWidth={2} />
                                    </CircleTool>
                                );
                            })}

                            <CircleTool
                                title="Cadastre"
                                active={showCadastre}
                                onClick={onToggleCadastre}
                            >
                                <Layers size={18} className={showCadastre ? 'text-[#0b4a59]' : 'text-gray-700'} strokeWidth={2} />
                            </CircleTool>
                        </div>
                    )}

                    <button
                        type="button"
                        aria-expanded={gearOpen}
                        aria-label="Map tools and base map"
                        onClick={() => {
                            setGearOpen((v) => !v);
                        }}
                        className={`flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-gray-50 active:scale-[0.97] ${
                            gearOpen ? 'h-11 w-11 ring-2 ring-[#0b4a59]/30' : 'h-12 w-12'
                        }`}
                    >
                        <Settings size={20} className="text-[#0b4a59]" strokeWidth={2} />
                    </button>
                </div>
            </div>
        </>
    );
}

function CircleTool({
    children,
    title,
    active,
    onClick,
}: {
    children: React.ReactNode;
    title: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] active:scale-[0.97] ${
                active
                    ? 'border-[#0b4a59] bg-[#0b4a59]/8 shadow-sm ring-2 ring-[#0b4a59]/20'
                    : 'border-gray-200 bg-white hover:border-[#0b4a59]/35'
            }`}
        >
            <span className="flex h-full w-full items-center justify-center [&>svg]:block">
                {children}
            </span>
        </button>
    );
}
