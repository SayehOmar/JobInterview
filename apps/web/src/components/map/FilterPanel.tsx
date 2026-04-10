'use client';

import { useEffect } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { useMapStore } from '@/store/mapStore';
import {
    GET_REGIONS,
    GET_DEPARTEMENTS,
    GET_COMMUNES,
    GET_LIEUX_DITS
} from '@/graphql/geospatial';
import { MapPin, TreePine, ChevronRight, RotateCcw } from 'lucide-react';

// Hardcoded regions with center coordinates and zoom levels
const REGIONS = [
    {
        code: 'NORMANDIE',
        name: 'Normandie',
        lat: 49.1829,
        lng: 0.3700,
        zoom: 7
    },
    {
        code: 'PAYS_DE_LA_LOIRE',
        name: 'Pays de la Loire',
        lat: 47.7633,
        lng: -0.3297,
        zoom: 7
    },
    {
        code: 'CENTRE_VAL_DE_LOIRE',
        name: 'Centre-Val de Loire',
        lat: 47.7516,
        lng: 1.6751,
        zoom: 7
    }
];

interface FilterPanelProps {
    onRegionSelect?: (lat: number, lng: number, zoom: number) => void;
}

export function FilterPanel({ onRegionSelect }: FilterPanelProps) {
    const { filters, setFilters, resetFilters } = useMapStore();

    const { data: regionsData, loading: loadingRegions } = useQuery(GET_REGIONS);
    const [getDepartements, { data: deptData, loading: loadingDepts }] = useLazyQuery(GET_DEPARTEMENTS);
    const [getCommunes, { data: communeData, loading: loadingCommunes }] = useLazyQuery(GET_COMMUNES);
    const [getLieuxDits, { data: lieuxDitsData, loading: loadingLieuxDits }] = useLazyQuery(GET_LIEUX_DITS);

    useEffect(() => {
        if (filters.regionCode) {
            getDepartements({ variables: { regionCode: filters.regionCode } });
        }
    }, [filters.regionCode, getDepartements]);

    useEffect(() => {
        if (filters.departementCode) {
            getCommunes({ variables: { departementCode: filters.departementCode } });
        }
    }, [filters.departementCode, getCommunes]);

    useEffect(() => {
        if (filters.communeCode) {
            getLieuxDits({ variables: { communeCode: filters.communeCode } });
        }
    }, [filters.communeCode, getLieuxDits]);

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;

        const selectedRegion = REGIONS.find(r => r.code === value);
        if (selectedRegion && onRegionSelect) {
            onRegionSelect(selectedRegion.lat, selectedRegion.lng, selectedRegion.zoom);
        }

        setFilters({
            regionCode: value || undefined,
            departementCode: undefined,
            communeCode: undefined,
            lieuDit: undefined,
        });
    };

    const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFilters({
            departementCode: value || undefined,
            communeCode: undefined,
            lieuDit: undefined,
        });
    };

    const handleCommuneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFilters({
            communeCode: value || undefined,
            lieuDit: undefined,
        });
    };

    const handleLieuDitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFilters({
            lieuDit: value || undefined,
        });
    };

    const hasFilters = filters.regionCode || filters.departementCode || filters.communeCode;

    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                <TreePine size={18} className="shrink-0 text-[#0b4a59]" />
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">Explore area</h3>
                    <p className="text-xs text-gray-500">Filter by region, department, commune</p>
                </div>
            </div>

            <div className="max-h-[38vh] space-y-3 overflow-y-auto overscroll-contain p-3 sm:max-h-[min(38vh,320px)]">
                {/* Region Select */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                        <MapPin size={14} />
                        Region
                    </label>
                    <div className="relative">
                        <select
                            value={filters.regionCode || ''}
                            onChange={handleRegionChange}
                            disabled={loadingRegions}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0b4a59] focus:border-transparent outline-none appearance-none cursor-pointer disabled:opacity-50"
                        >
                            <option value="">Select a region...</option>

                            <optgroup label="Regions">
                                {REGIONS.map((region) => (
                                    <option key={region.code} value={region.code}>
                                        {region.name}
                                    </option>
                                ))}
                            </optgroup>

                            {regionsData?.regions?.length > 0 && (
                                <optgroup label="Other Regions">
                                    {regionsData.regions.map((code: string) => (
                                        <option key={code} value={code}>Region {code}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Department Select */}
                {filters.regionCode && !REGIONS.find(r => r.code === filters.regionCode) && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <MapPin size={14} />
                            Department
                        </label>
                        <div className="relative">
                            <select
                                value={filters.departementCode || ''}
                                onChange={handleDeptChange}
                                disabled={loadingDepts}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0b4a59] focus:border-transparent outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Select a department...</option>
                                {deptData?.departements.map((code: string) => (
                                    <option key={code} value={code}>Department {code}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                )}

                {/* Commune Select */}
                {filters.departementCode && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <MapPin size={14} />
                            Commune
                        </label>
                        <div className="relative">
                            <select
                                value={filters.communeCode || ''}
                                onChange={handleCommuneChange}
                                disabled={loadingCommunes}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0b4a59] focus:border-transparent outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Select a commune...</option>
                                {communeData?.communes.map((code: string) => (
                                    <option key={code} value={code}>Commune {code}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                )}

                {/* Lieu Dit Select */}
                {filters.communeCode && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <MapPin size={14} />
                            Lieu Dit
                        </label>
                        <div className="relative">
                            <select
                                value={filters.lieuDit || ''}
                                onChange={handleLieuDitChange}
                                disabled={loadingLieuxDits}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0b4a59] focus:border-transparent outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Select a lieu dit...</option>
                                {lieuxDitsData?.lieuxDits.map((name: string) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                )}

                {/* Reset Button */}
                {hasFilters && (
                    <button
                        onClick={resetFilters}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <RotateCcw size={14} />
                        Reset filters
                    </button>
                )}
            </div>
        </div>
    );
}