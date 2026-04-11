'use client';

import { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useQuery, useMutation } from '@apollo/client/react';
import { useMapStore } from '@/store/mapStore';
import { useAuthStore } from '@/store/authStore';
import { UPDATE_MAP_STATE } from '@/graphql/auth';
import { GET_MY_POLYGONS, SAVE_POLYGON_MUTATION } from '@/graphql/polygons';
import { queryAllLayers } from '@/services/wmsFeatureInfo';
import {
    buildLocationContextFromDrawnGeometry,
    type SavedLocationContext,
} from '@/services/locationContextSnapshot';
import { WMS_LAYERS, getWMSTileUrl, WMSLayerConfig } from '@/services/wmsLayers';
import { mergeLayersWithStoredColors, saveLayerColorOverrides } from '@/services/wmsLayerColorsStorage';
import { applyRasterTintToMapLayer, getRasterTintPaintProps } from '@/services/wmsRasterTint';
import { createMapRuntime, MapStyleKey } from '@/services/map/mapProviders';

import { FilterPanel } from './FilterPanel';
import { SavePolygonModal } from './SavePolygonModal';
import { PolygonResultsPanel } from './PolygonResultsPanel';
import { SavedPolygonsList } from './SavedPolygonsList';
import { LayerControlPanel } from './LayerControlPanel';
import { UserMenuDropdown } from './UserMenuDropdown';
import { FeatureQueryPopup } from './FeatureQueryPopup';
import { MapFloatingControls } from './MapFloatingControls';

import { Map as MapIcon, Satellite, Mountain, Sun, Moon, GripVertical } from 'lucide-react';

// Base layer configurations
const BASE_LAYERS = {
    satellite: {
        url: 'mapbox://styles/mapbox/satellite-v9',
        label: 'Satellite',
        icon: Satellite
    },
    streets: {
        url: 'mapbox://styles/mapbox/streets-v12',
        label: 'Streets',
        icon: MapIcon
    },
    terrain: {
        url: 'mapbox://styles/mapbox/outdoors-v12',
        label: 'Terrain',
        icon: Mountain
    },
    light: {
        url: 'mapbox://styles/mapbox/light-v11',
        label: 'Light',
        icon: Sun
    },
    dark: {
        url: 'mapbox://styles/mapbox/dark-v11',
        label: 'Dark',
        icon: Moon
    }
};

// Hardcoded regions for navigation
const REGIONS = [
    { code: 'NORMANDIE', name: 'Normandie', lat: 49.1829, lng: 0.3700, zoom: 7 },
    { code: 'PAYS_DE_LA_LOIRE', name: 'Pays de la Loire', lat: 47.7633, lng: -0.3297, zoom: 7 },
    { code: 'CENTRE_VAL_DE_LOIRE', name: 'Centre-Val de Loire', lat: 47.7516, lng: 1.6751, zoom: 7 }
];

export function ForestMap() {
    const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [showResults, setShowResults] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(5);
    const [wmsLayers, setWmsLayers] = useState<WMSLayerConfig[]>(WMS_LAYERS);
    const [isDrawing, setIsDrawing] = useState(false);
    /** After user completes a polygon on the map, the saved-polygons empty card may appear. */
    const [hasCompletedPolygonDraw, setHasCompletedPolygonDraw] = useState(false);
    /** MapboxDraw has at least one feature — show polygon + delete in gear dock. */
    const [hasPolygonOnMap, setHasPolygonOnMap] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);
    const [baseLayer, setBaseLayer] = useState<keyof typeof BASE_LAYERS>('satellite');
    const [queryPopup, setQueryPopup] = useState<{
        visible: boolean;
        lng: number;
        lat: number;
        data: any;
    } | null>(null);

    const mapContainer = useRef<HTMLDivElement>(null);
    const topRightStackRef = useRef<HTMLDivElement>(null);
    const leftStackDragRef = useRef<HTMLDivElement>(null);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [layersMenuOpen, setLayersMenuOpen] = useState(false);
    const map = useRef<any>(null);
    const draw = useRef<any>(null);
    const mapProvider = useRef<'mapbox' | 'maplibre' | null>(null);
    const setBaseStyle = useRef<((styleKey: MapStyleKey) => void) | null>(null);

    const { lng, lat, zoom, filters, showCadastre, setViewState, setShowCadastre, setFilters } = useMapStore();
    const { user, logout, updateUser } = useAuthStore();

    const { data: savedPolygonsData, refetch: refetchPolygons } = useQuery(GET_MY_POLYGONS);
    const [updateMapState] = useMutation(UPDATE_MAP_STATE);
    const [savePolygon] = useMutation(SAVE_POLYGON_MUTATION);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!topRightStackRef.current?.contains(e.target as Node)) {
                setProfileMenuOpen(false);
                setLayersMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return;

        const initialLng = user?.lastLng ?? lng;
        const initialLat = user?.lastLat ?? lat;
        const initialZoom = user?.lastZoom ?? zoom;

        let destroyed = false;

        (async () => {
            const runtime = await createMapRuntime({
                container: mapContainer.current!,
                center: [initialLng, initialLat],
                zoom: initialZoom,
                styleKey: 'satellite',
            });
            if (destroyed) {
                runtime.map?.remove?.();
                return;
            }

            map.current = runtime.map;
            draw.current = runtime.draw;
            mapProvider.current = runtime.provider;
            setBaseStyle.current = runtime.setBaseStyle;

            // Track zoom for layer visibility
            const updateZoom = () => {
                const newZoom = map.current!.getZoom();
                setCurrentZoom(newZoom);
                updateWMSLayerVisibility(newZoom);
            };

            map.current.on('load', () => {
                if (typeof map.current!.setPadding === 'function') {
                    map.current!.setPadding({ top: 0, left: 0, right: 0, bottom: 0 });
                }
                setMapLoaded(true);
                addWMSLayers(map.current!);
                updateZoom();
            });

            map.current.on('zoom', updateZoom);

            const syncDrawPolygonPresence = () => {
                const n = draw.current?.getAll()?.features?.length ?? 0;
                setHasPolygonOnMap(n > 0);
            };

            // Handle polygon creation
            map.current.on('draw.create', (e: any) => {
                const geometry = e.features[0].geometry;
                setDrawnGeometry(geometry);
                setHasCompletedPolygonDraw(true);
                setShowSaveModal(true);
                setIsDrawing(false);
                syncDrawPolygonPresence();
            });

            map.current.on('draw.delete', syncDrawPolygonPresence);
            map.current.on('draw.update', syncDrawPolygonPresence);

            // Handle draw mode changes
            map.current.on('draw.modechange', (e: any) => {
                setIsDrawing(e.mode === 'draw_polygon');
            });

            // Save map state on move
            map.current.on('moveend', () => {
                const center = map.current!.getCenter();
                const newZoom = map.current!.getZoom();
                setViewState(center.lng, center.lat, newZoom);

                if (user) {
                    updateMapState({
                        variables: {
                            input: {
                                lng: center.lng,
                                lat: center.lat,
                                zoom: newZoom,
                                filters,
                                activeLayers: wmsLayers.filter(l => l.visible).map(l => l.id),
                            },
                        },
                    }).then((result) => {
                        updateUser(result.data.updateMapState);
                    }).catch(console.error);
                }
            });

            // Feature query on click (skip if drawing)
            const handleMapClick = async (e: any) => {
                if (draw.current?.getMode() === 'draw_polygon') return;

                const selected = draw.current?.getSelected();
                // @ts-ignore
                if (selected?.features?.length > 0) return;

                setIsQuerying(true);
                const { lng, lat } = e.lngLat;
                const data = await queryAllLayers(lng, lat, map.current!);
                setIsQuerying(false);

                if (data?.region || data?.department || data?.commune || data?.forest) {
                    setQueryPopup({ visible: true, lng, lat, data });
                }
            };

            map.current.on('click', handleMapClick);
        })().catch((err) => {
            console.error('Failed to initialize map runtime', err);
        });

        return () => {
            destroyed = true;
            map.current?.remove?.();
            map.current = null;
            draw.current = null;
            mapProvider.current = null;
            setBaseStyle.current = null;
        };
    }, [user?.id]);

    // Restore WMS layer colors from localStorage (same persistence idea as view state — survives new tabs).
    useEffect(() => {
        setWmsLayers(mergeLayersWithStoredColors(WMS_LAYERS));
    }, []);

    // Keep raster tint paint in sync with wmsLayers (initial load, hydration, and color edits).
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        wmsLayers.forEach((layer) => {
            const mapLayerId = `wms-layer-${layer.id}`;
            if (!map.current!.getLayer(mapLayerId)) return;
            applyRasterTintToMapLayer(
                map.current!,
                mapLayerId,
                WMS_LAYERS.find((l) => l.id === layer.id)?.color,
                layer.color,
            );
        });
    }, [mapLoaded, wmsLayers]);

    // Handle base layer change
    const handleBaseLayerChange = (layerKey: keyof typeof BASE_LAYERS) => {
        if (!map.current) return;

        setBaseLayer(layerKey);
        setBaseStyle.current?.(layerKey as MapStyleKey);

        // Re-add WMS layers after style change
        map.current.once('style.load', () => {
            if (typeof map.current!.setPadding === 'function') {
                map.current!.setPadding({ top: 0, left: 0, right: 0, bottom: 0 });
            }
            addWMSLayers(map.current!);
            if (savedPolygonsData?.myPolygons) {
                displaySavedPolygonsOnMap(map.current!, savedPolygonsData.myPolygons, false);
            }
        });
    };

    // Add WMS layers
    const addWMSLayers = (mapInstance: any) => {
        // Clean up existing layers first
        wmsLayers.forEach((layer) => {
            const sourceId = `wms-${layer.id}`;
            const layerId = `wms-layer-${layer.id}`;

            if (mapInstance.getLayer(layerId)) {
                mapInstance.removeLayer(layerId);
            }
            if (mapInstance.getSource(sourceId)) {
                mapInstance.removeSource(sourceId);
            }
        });

        // Add all WMS layers
        wmsLayers.forEach((layer) => {
            const sourceId = `wms-${layer.id}`;
            const layerId = `wms-layer-${layer.id}`;

            mapInstance.addSource(sourceId, {
                type: 'raster',
                tiles: [getWMSTileUrl(layer.layerName)],
                tileSize: 256,
                scheme: 'xyz',
            });

            mapInstance.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: {
                    'raster-opacity': layer.visible ? layer.opacity : 0,
                    ...getRasterTintPaintProps(
                        WMS_LAYERS.find((l) => l.id === layer.id)?.color,
                        layer.color,
                    ),
                },
                layout: { visibility: layer.visible ? 'visible' : 'none' },
            });
        });
        updateWMSLayerVisibility(map.current!.getZoom());
    };

    const updateWMSLayerVisibility = (zoom: number) => {
        if (!map.current) return;
        wmsLayers.forEach((layer) => {
            const layerId = `wms-layer-${layer.id}`;
            if (!map.current!.getLayer(layerId)) return;
            const shouldBeVisible = layer.visible && zoom >= layer.minZoom && zoom <= layer.maxZoom;
            map.current!.setLayoutProperty(layerId, 'visibility', shouldBeVisible ? 'visible' : 'none');
        });
    };

    const handleToggleLayer = (layerId: string) => {
        const updatedLayers = wmsLayers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l));
        setWmsLayers(updatedLayers);
        if (map.current) {
            const layer = updatedLayers.find(l => l.id === layerId);
            const mapLayerId = `wms-layer-${layerId}`;
            if (layer && map.current.getLayer(mapLayerId)) {
                const shouldBeVisible = layer.visible && currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;
                map.current.setLayoutProperty(mapLayerId, 'visibility', shouldBeVisible ? 'visible' : 'none');
            }
        }
    };

    const handleLayerColorChange = (layerId: string, color: string) => {
        setWmsLayers((prev) => {
            const next = prev.map((l) => (l.id === layerId ? { ...l, color } : l));
            saveLayerColorOverrides(next);
            return next;
        });
    };

    // Start drawing mode (same MapboxDraw mode as the old polygon control)
    const handleDrawStart = () => {
        if (!draw.current) return;
        draw.current.changeMode('draw_polygon');
        setIsDrawing(true);
    };

    const handleDrawDelete = () => {
        if (!draw.current) return;
        draw.current.deleteAll();
        setDrawnGeometry(null);
        setShowSaveModal(false);
        setHasPolygonOnMap(false);
    };

    // Handle polygon save
    const handleSavePolygon = async (name: string) => {
        if (!drawnGeometry) return;

        try {
            let locationContext: SavedLocationContext | undefined;
            if (map.current) {
                try {
                    const snap = await buildLocationContextFromDrawnGeometry(
                        drawnGeometry as Record<string, unknown>,
                        map.current,
                    );
                    if (snap) locationContext = snap;
                } catch (wmsErr) {
                    console.warn('WMS location snapshot failed (polygon still saves)', wmsErr);
                }
            }

            const { data } = await savePolygon({
                variables: {
                    input: {
                        name: name.trim(),
                        geometry: drawnGeometry,
                        ...(locationContext ? { locationContext } : {}),
                    },
                },
            });

            // @ts-ignore
            setAnalysisResult(data.savePolygon);
            setShowResults(true);
            setShowSaveModal(false);

            draw.current?.deleteAll();
            setDrawnGeometry(null);
            setHasPolygonOnMap(false);
            refetchPolygons();
        } catch (error) {
            console.error('Error saving polygon:', error);
            alert('Failed to save polygon. Please try again.');
        }
    };

    // Handle region navigation
    const handleRegionNavigate = (lat: number, lng: number, zoom: number) => {
        if (!map.current) return;
        map.current.flyTo({
            center: [lng, lat],
            zoom: zoom,
            essential: true
        });
    };

    // Display saved polygons
    useEffect(() => {
        // @ts-ignore
        if (!map.current || !savedPolygonsData?.myPolygons || !mapLoaded) return;

        const timer = setTimeout(() => {
            // @ts-ignore
            displaySavedPolygonsOnMap(map.current!, savedPolygonsData.myPolygons, false);
        }, 500);

        return () => clearTimeout(timer);
    }, [savedPolygonsData, mapLoaded]);

    const displaySavedPolygonsOnMap = (mapInstance: any, polygons: any[], fitBounds: boolean = false) => {
        if (!mapInstance.isStyleLoaded()) {
            setTimeout(() => displaySavedPolygonsOnMap(mapInstance, polygons, fitBounds), 200);
            return;
        }

        // Clean up existing
        if (mapInstance.getLayer('saved-polygons-fill')) mapInstance.removeLayer('saved-polygons-fill');
        if (mapInstance.getLayer('saved-polygons-outline')) mapInstance.removeLayer('saved-polygons-outline');
        if (mapInstance.getSource('saved-polygons')) mapInstance.removeSource('saved-polygons');

        if (polygons.length === 0) return;

        const validPolygons = polygons.map((p) => {
            let geometry = p.geometry;
            if (typeof geometry === 'string') {
                try { geometry = JSON.parse(geometry); } catch { return null; }
            }
            if (!geometry?.coordinates || !Array.isArray(geometry.coordinates)) return null;
            return { ...p, geometry };
        }).filter(Boolean);

        if (validPolygons.length === 0) return;

        const geojson = {
            type: 'FeatureCollection',
            features: validPolygons.map((p) => ({
                type: 'Feature',
                id: p.id,
                geometry: p.geometry,
                properties: { name: p.name, area: p.areaHectares, status: p.status },
            })),
        };

        try {
            mapInstance.addSource('saved-polygons', { type: 'geojson', data: geojson });
            mapInstance.addLayer({
                id: 'saved-polygons-fill',
                type: 'fill',
                source: 'saved-polygons',
                paint: { 'fill-color': '#0b4a59', 'fill-opacity': 0.2 },
            });
            mapInstance.addLayer({
                id: 'saved-polygons-outline',
                type: 'line',
                source: 'saved-polygons',
                paint: { 'line-color': '#0b4a59', 'line-width': 2, 'line-dasharray': [2, 2] },
            });
        } catch (error) {
            console.error('Error adding polygons:', error);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/auth';
    };

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-gray-900">
            {/* Full-viewport map (no document scroll) */}
            <div
                ref={mapContainer}
                className={`forest-map absolute inset-0 h-full w-full touch-manipulation ${isDrawing ? 'forest-map--draw-polygon' : ''}`}
            />

            <div
                ref={topRightStackRef}
                className="pointer-events-auto absolute right-3 top-3 z-30 flex w-56 flex-col gap-2 sm:right-4 sm:top-4"
            >
                <UserMenuDropdown
                    userEmail={user?.email}
                    onLogout={handleLogout}
                    open={profileMenuOpen}
                    onOpenChange={(v) => {
                        setProfileMenuOpen(v);
                        if (v) setLayersMenuOpen(false);
                    }}
                />
                <LayerControlPanel
                    layers={wmsLayers}
                    onToggleLayer={handleToggleLayer}
                    onLayerColorChange={handleLayerColorChange}
                    currentZoom={currentZoom}
                    open={layersMenuOpen}
                    onOpenChange={(v) => {
                        setLayersMenuOpen(v);
                        if (v) setProfileMenuOpen(false);
                    }}
                />
            </div>

            <MapFloatingControls
                onDrawStart={handleDrawStart}
                onDrawPolygonTool={handleDrawStart}
                onDrawDelete={handleDrawDelete}
                hasPolygonOnMap={hasPolygonOnMap}
                isDrawing={isDrawing}
                baseLayer={baseLayer}
                onBaseLayerChange={(key) => handleBaseLayerChange(key)}
                showCadastre={showCadastre}
                onToggleCadastre={() => setShowCadastre(!showCadastre)}
            />

            {/* Left stack: filters + saved polygons — draggable; scroll only inside cards */}
            <div className="pointer-events-none absolute left-0 top-0 z-20 h-dvh w-[min(22rem,calc(100vw-0.75rem))] overflow-hidden pl-2 pt-3 sm:left-3 sm:pl-0 sm:pt-4">
                <div className="relative h-full w-full">
                    <Draggable
                        nodeRef={leftStackDragRef}
                        handle=".map-left-stack-drag-handle"
                        bounds="parent"
                        defaultPosition={{ x: 0, y: 0 }}
                    >
                        <div
                            ref={leftStackDragRef}
                            className="pointer-events-auto flex min-h-0 min-w-0 max-h-[calc(100dvh-1.25rem)] w-full flex-col gap-2 overflow-hidden"
                        >
                            <div
                                className="map-left-stack-drag-handle flex shrink-0 cursor-grab select-none items-center gap-2 rounded-lg border border-gray-200/90 bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm active:cursor-grabbing"
                                title="Drag to move this panel on the map"
                            >
                                <GripVertical size={14} className="shrink-0 text-gray-400" aria-hidden />
                                <span className="truncate">Move panel</span>
                            </div>
                            <FilterPanel onRegionSelect={handleRegionNavigate} />
                            <SavedPolygonsList
                                showEmptyState={hasCompletedPolygonDraw}
                                onSelectPolygon={(p) => {
                                    setAnalysisResult(p);
                                    setShowResults(true);
                                }}
                            />
                        </div>
                    </Draggable>
                </div>
            </div>

            {/* Save Polygon Modal */}
            {showSaveModal && drawnGeometry && (
                <SavePolygonModal
                    geometry={drawnGeometry}
                    onClose={() => {
                        setShowSaveModal(false);
                        setDrawnGeometry(null);
                        draw.current?.deleteAll();
                        setHasPolygonOnMap(false);
                    }}
                    onSaved={handleSavePolygon}
                />
            )}

            {/* Analysis Results Panel */}
            {showResults && analysisResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <PolygonResultsPanel
                        key={analysisResult.id}
                        result={analysisResult}
                        mapRef={map}
                        onClose={() => setShowResults(false)}
                    />
                </div>
            )}

            {/* Feature Query Popup */}
            {queryPopup?.visible && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 50 }}
                >
                    <div className="pointer-events-auto">
                        <FeatureQueryPopup
                            lng={queryPopup.lng}
                            lat={queryPopup.lat}
                            data={queryPopup.data}
                            onClose={() => setQueryPopup(null)}
                            onSelectRegion={(code) => {
                                setFilters({ regionCode: code });
                                setQueryPopup(null);
                            }}
                            onSelectDepartment={(code) => {
                                setFilters({ ...filters, departementCode: code });
                                setQueryPopup(null);
                            }}
                            onSelectCommune={(code) => {
                                setFilters({ ...filters, communeCode: code });
                                setQueryPopup(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Query Loading Indicator */}
            {isQuerying && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white rounded-lg shadow-lg px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-4 h-4 border-2 border-[#0b4a59] border-t-transparent rounded-full animate-spin" />
                        Querying layers...
                    </div>
                </div>
            )}

        </div>
    );
}