'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_POLYGONS, DELETE_POLYGON_MUTATION } from '@/graphql/polygons';
import { MapPin, Trash2, Trees, Clock, AlertCircle, Eye } from 'lucide-react';

interface SavedPolygonsListProps {
    onSelectPolygon: (polygon: any) => void;
    onHighlightPolygon?: (polygon: any) => void;  // New: for map highlighting
    selectedPolygonId?: string | null;
    /** When false and there are no saved polygons, the empty-state card is not shown. */
    showEmptyState?: boolean;
}

export function SavedPolygonsList({
                                      onSelectPolygon,
                                      onHighlightPolygon,
                                      selectedPolygonId,
                                      showEmptyState = false,
                                  }: SavedPolygonsListProps) {
    const { data, loading, refetch } = useQuery(GET_MY_POLYGONS);
    const [deletePolygon] = useMutation(DELETE_POLYGON_MUTATION);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this polygon?')) return;

        await deletePolygon({ variables: { polygonId: id } });
        refetch();
    };

    const handleShowOnMap = (polygon: any, e: React.MouseEvent) => {
        e.stopPropagation();
        onHighlightPolygon?.(polygon);
    };

    const polygons = data?.myPolygons || [];

    // Initial request: show skeleton until we know whether the user has saved polygons.
    if (loading && data === undefined) {
        return (
            <div className="relative w-full rounded-xl border border-gray-200 bg-white p-4 shadow-md">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (loading && (polygons.length > 0 || showEmptyState)) {
        return (
            <div className="relative w-full rounded-xl border border-gray-200 bg-white p-4 shadow-md">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (loading) {
        return null;
    }

    if (polygons.length === 0 && !showEmptyState) {
        return null;
    }

    if (polygons.length === 0) {
        return (
            <div className="relative flex min-h-[168px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                <div className="flex flex-1 flex-col items-center justify-center px-3 py-6 text-center text-gray-500">
                    <MapPin size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No saved polygons yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Saved areas will appear here after you save a draw.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
            <div className="p-3 bg-gray-50 border-b border-gray-200 sticky top-0 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Trees size={18} className="text-green-600" />
                    Saved Polygons ({polygons.length})
                </h3>
            </div>

            <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain">
                {polygons.map((polygon: any) => (
                    <div
                        key={polygon.id}
                        onClick={() => onSelectPolygon(polygon)}
                        className={`p-3 hover:bg-gray-50 cursor-pointer group transition-colors ${
                            selectedPolygonId === polygon.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">{polygon.name}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span>{polygon.areaHectares.toFixed(2)} ha</span>
                                    <span className="flex items-center gap-1">
                    {polygon.status === 'completed' ? (
                        <Trees size={12} className="text-green-600" />
                    ) : polygon.status === 'pending' ? (
                        <Clock size={12} className="text-yellow-600" />
                    ) : (
                        <AlertCircle size={12} className="text-red-600" />
                    )}
                                        {polygon.status}
                  </span>
                                </div>
                                {polygon.analysisResults?.totalForestArea && (
                                    <p className="text-xs text-green-600 mt-1">
                                        Forest: {polygon.analysisResults.totalForestArea.toFixed(1)} ha
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleShowOnMap(polygon, e)}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                                    title="Show on map"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(polygon.id, e)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}