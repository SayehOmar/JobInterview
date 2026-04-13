import { create } from 'zustand';

export interface MapFilters {
    regionCode?: string;
    departementCode?: string;
    communeCode?: string;
}

interface MapState {
    lng: number;
    lat: number;
    zoom: number;
    filters: MapFilters;
    showCadastre: boolean;
    setViewState: (lng: number, lat: number, zoom: number) => void;
    setFilters: (filters: MapFilters) => void;
    setShowCadastre: (show: boolean) => void;
    resetFilters: () => void;
}

// Default to center of France
export const useMapStore = create<MapState>((set) => ({
    lng: 2.2137,
    lat: 46.2276,
    zoom: 5,
    filters: {},
    showCadastre: false,

    setViewState: (lng, lat, zoom) => set({ lng, lat, zoom }),

    setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
    })),

    setShowCadastre: (show) => set({ showCadastre: show }),

    resetFilters: () => set({
        filters: {},
        lng: 2.2137,
        lat: 46.2276,
        zoom: 5
    }),
}));