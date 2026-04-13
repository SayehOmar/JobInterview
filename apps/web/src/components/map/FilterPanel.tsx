"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { useMapStore } from "@/store/mapStore";
import { GET_REGIONS, GET_DEPARTEMENTS, GET_COMMUNES } from "@/graphql/geospatial";
import {
  labelForRegionCode,
  REGION_NAV,
  FALLBACK_REGION_CODES,
} from "@/services/regionLabels";
import { getDepartmentFlyTo } from "@/services/frAdministrativeNav";
import {
  departementsForRegion,
  sortDepartementCodes,
} from "@/services/frInseeAdmin";
import { labelDepartement } from "@/services/frDepartmentNames";
import {
  fetchCommunesForDepartment,
  type CommuneOption,
} from "@/services/communesFromWfs";
import {
  LocationCombobox,
  type ComboboxOption,
} from "@/components/map/LocationCombobox";
import { MapPin, TreePine, ChevronRight, ChevronDown, RotateCcw } from "lucide-react";

interface FilterPanelProps {
  onRegionSelect?: (lat: number, lng: number, zoom: number) => void;
  onDepartmentSelect?: (lat: number, lng: number, zoom: number) => void;
}

export function FilterPanel({
  onRegionSelect,
  onDepartmentSelect,
}: FilterPanelProps) {
  const { filters, setFilters, resetFilters } = useMapStore();

  const [panelExpanded, setPanelExpanded] = useState(true);

  const { data: regionsData, loading: loadingRegions } = useQuery(GET_REGIONS);
  const [getDepartements, { data: deptData, loading: loadingDepts }] =
    useLazyQuery(GET_DEPARTEMENTS);
  const [getCommunes, { data: communeData, loading: loadingCommunes }] =
    useLazyQuery(GET_COMMUNES);

  const [wfsCommunes, setWfsCommunes] = useState<CommuneOption[]>([]);

  const sortedRegionCodes = useMemo(() => {
    const list = regionsData?.regions as string[] | undefined;
    if (list?.length) {
      return [...list].sort((a, b) => a.localeCompare(b, "fr"));
    }
    return FALLBACK_REGION_CODES;
  }, [regionsData?.regions]);

  const regionComboboxOptions: ComboboxOption[] = useMemo(
    () =>
      sortedRegionCodes.map((code) => ({
        value: code,
        label: labelForRegionCode(code),
      })),
    [sortedRegionCodes],
  );

  const allowedDeptsForRegion = useMemo(
    () =>
      filters.regionCode ? departementsForRegion(filters.regionCode) : [],
    [filters.regionCode],
  );

  const departmentOptions = useMemo(() => {
    if (!filters.regionCode) return [];
    const api = (deptData?.departements ?? []) as string[];
    const filtered = api.filter((d) => allowedDeptsForRegion.includes(d));
    const fromApi = sortDepartementCodes(filtered);
    if (fromApi.length > 0) return fromApi;
    return sortDepartementCodes(allowedDeptsForRegion);
  }, [
    filters.regionCode,
    deptData?.departements,
    allowedDeptsForRegion,
  ]);

  const departmentComboboxOptions: ComboboxOption[] = useMemo(
    () =>
      departmentOptions.map((code) => ({
        value: code,
        label: `${code} — ${labelDepartement(code)}`,
      })),
    [departmentOptions],
  );

  const communeOptions = useMemo((): CommuneOption[] => {
    const api = (communeData?.communes ?? []) as string[];
    if (api.length > 0) {
      return [...api]
        .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
        .map((code) => ({ code, nom: "" }));
    }
    return wfsCommunes;
  }, [communeData?.communes, wfsCommunes]);

  const communeComboboxOptions: ComboboxOption[] = useMemo(
    () =>
      communeOptions.map((c) => ({
        value: c.code,
        label: c.nom ? `${c.code} — ${c.nom}` : c.code,
      })),
    [communeOptions],
  );

  const summaryLine = useMemo(() => {
    const parts: string[] = [];
    if (filters.regionCode) {
      parts.push(labelForRegionCode(filters.regionCode));
    }
    if (filters.departementCode) {
      parts.push(
        `${filters.departementCode} — ${labelDepartement(filters.departementCode)}`,
      );
    }
    if (filters.communeCode) {
      const c = communeOptions.find((x) => x.code === filters.communeCode);
      parts.push(
        c?.nom
          ? `${filters.communeCode} — ${c.nom}`
          : filters.communeCode,
      );
    }
    return parts.join(" · ");
  }, [filters.regionCode, filters.departementCode, filters.communeCode, communeOptions]);

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
    if (!filters.departementCode) {
      setWfsCommunes([]);
      return;
    }
    let cancelled = false;
    fetchCommunesForDepartment(filters.departementCode).then((rows) => {
      if (!cancelled) setWfsCommunes(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [filters.departementCode]);

  const pickRegion = (code: string | undefined) => {
    if (!code) {
      setFilters({
        regionCode: undefined,
        departementCode: undefined,
        communeCode: undefined,
      });
      return;
    }
    const nav = REGION_NAV[code];
    if (nav && onRegionSelect) {
      onRegionSelect(nav.lat, nav.lng, nav.zoom);
    }
    setFilters({
      regionCode: code,
      departementCode: undefined,
      communeCode: undefined,
    });
  };

  const pickDepartment = (code: string | undefined) => {
    if (!code) {
      setFilters({
        departementCode: undefined,
        communeCode: undefined,
      });
      return;
    }
    const nav = getDepartmentFlyTo(code, filters.regionCode);
    if (nav && onDepartmentSelect) {
      onDepartmentSelect(nav.lat, nav.lng, nav.zoom);
    }
    setFilters({
      departementCode: code,
      communeCode: undefined,
    });
  };

  const pickCommune = (code: string | undefined) => {
    setFilters({
      communeCode: code || undefined,
    });
  };

  const hasFilters =
    filters.regionCode || filters.departementCode || filters.communeCode;

  return (
    <div className="relative flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
      <button
        type="button"
        onClick={() => setPanelExpanded((v) => !v)}
        className="flex w-full items-start gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-left transition hover:bg-gray-100/80"
        aria-expanded={panelExpanded}
      >
        <TreePine size={18} className="mt-0.5 shrink-0 text-[#0b4a59]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Explore area</h3>
          {!panelExpanded && hasFilters && (
            <p className="truncate text-xs text-gray-600" title={summaryLine}>
              {summaryLine}
            </p>
          )}
          {panelExpanded && (
            <p className="text-xs text-gray-500">
              Search or pick region → department → commune. Map layers follow
              your selection.
            </p>
          )}
        </div>
        <span className="shrink-0 text-gray-500">
          {panelExpanded ? (
            <ChevronDown size={18} strokeWidth={2} />
          ) : (
            <ChevronRight size={18} strokeWidth={2} />
          )}
        </span>
      </button>

      {panelExpanded && (
        <div className="max-h-[38vh] min-h-0 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:max-h-[min(38vh,320px)]">
          <div>
            <label
              className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700"
              htmlFor="explore-region"
            >
              <MapPin size={14} />
              Region
            </label>
            <LocationCombobox
              id="explore-region"
              options={regionComboboxOptions}
              value={filters.regionCode}
              onChange={pickRegion}
              placeholder={
                loadingRegions ? "Loading regions…" : "Type to search region…"
              }
              disabled={loadingRegions}
              emptyHint="No region matches"
            />
          </div>

          {filters.regionCode && (
            <div className="animate-in slide-in-from-top-2">
              <label
                className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700"
                htmlFor="explore-dept"
              >
                <MapPin size={14} />
                Department
              </label>
              <LocationCombobox
                id="explore-dept"
                options={departmentComboboxOptions}
                value={filters.departementCode}
                onChange={pickDepartment}
                placeholder="Type to search department…"
                disabled={loadingDepts && departmentOptions.length === 0}
                emptyHint="No department matches"
              />
            </div>
          )}

          {filters.departementCode && (
            <div className="animate-in slide-in-from-top-2">
              <label
                className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700"
                htmlFor="explore-commune"
              >
                <MapPin size={14} />
                Commune
              </label>
              <LocationCombobox
                id="explore-commune"
                options={communeComboboxOptions}
                value={filters.communeCode}
                onChange={pickCommune}
                placeholder="Type to search commune…"
                disabled={loadingCommunes && communeOptions.length === 0}
                emptyHint="No commune matches"
              />
            </div>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={() => resetFilters()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200"
            >
              <RotateCcw size={14} />
              Reset filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
