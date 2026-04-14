"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { useMapStore } from "@/store/mapStore";
import {
  GET_REGIONS,
  GET_DEPARTEMENTS,
  GET_COMMUNES,
} from "@/graphql/geospatial";
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
  fetchCommuneBounds,
  type LngLatBounds,
} from "@/services/communeBoundsFromWfs";
import {
  LocationCombobox,
  type ComboboxOption,
} from "@/components/map/LocationCombobox";
import { TreePine, RotateCcw, X } from "lucide-react";
import { savedPolyPillBtnWideNeutral } from "@/components/map/savedPolygonsUi";

interface FilterPanelProps {
  onRegionSelect?: (lat: number, lng: number, zoom: number) => void;
  onDepartmentSelect?: (lat: number, lng: number, zoom: number) => void;
  onCommuneSelect?: (bounds: LngLatBounds) => void;
}

export function FilterPanel({
  onRegionSelect,
  onDepartmentSelect,
  onCommuneSelect,
}: FilterPanelProps) {
  const { filters, setFilters, resetFilters } = useMapStore();

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
    () => (filters.regionCode ? departementsForRegion(filters.regionCode) : []),
    [filters.regionCode],
  );

  const departmentOptions = useMemo(() => {
    if (!filters.regionCode) return [];
    const api = (deptData?.departements ?? []) as string[];
    const filtered = api.filter((d) => allowedDeptsForRegion.includes(d));
    const fromApi = sortDepartementCodes(filtered);
    if (fromApi.length > 0) return fromApi;
    return sortDepartementCodes(allowedDeptsForRegion);
  }, [filters.regionCode, deptData?.departements, allowedDeptsForRegion]);

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

  const selectedCommune = useMemo(() => {
    if (!filters.communeCode) return undefined;
    return communeOptions.find((x) => x.code === filters.communeCode);
  }, [filters.communeCode, communeOptions]);

  const communeChipLabel = useMemo(() => {
    if (!filters.communeCode) return "";
    if (selectedCommune?.nom) {
      return `${filters.communeCode} — ${selectedCommune.nom}`;
    }
    return filters.communeCode;
  }, [filters.communeCode, selectedCommune]);

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

  const pickCommune = async (code: string | undefined) => {
    setFilters({
      communeCode: code || undefined,
    });
    if (code && onCommuneSelect) {
      try {
        const bounds = await fetchCommuneBounds(code);
        if (bounds) onCommuneSelect(bounds);
      } catch {
        // ignore — filters still apply even if WFS navigation fails
      }
    }
  };

  const hasFilters =
    filters.regionCode || filters.departementCode || filters.communeCode;

  const labelRow =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="relative flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="border-b border-slate-100 bg-linear-to-b from-slate-50/80 to-white px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <TreePine size={18} className="mt-0.5 shrink-0 text-[#0b4a59]" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
              Explore area
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Choose region, then department and commune. Map layers follow your
              selection.
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[38vh] min-h-0 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:max-h-[min(38vh,320px)]">
        {hasFilters && (
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Active filters
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filters.regionCode && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-slate-800 shadow-sm">
                  <span
                    className="min-w-0 truncate"
                    title={labelForRegionCode(filters.regionCode)}
                  >
                    {labelForRegionCode(filters.regionCode)}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove region filter"
                    onClick={() => pickRegion(undefined)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </span>
              )}
              {filters.departementCode && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-slate-800 shadow-sm">
                  <span
                    className="min-w-0 truncate"
                    title={`${filters.departementCode} — ${labelDepartement(filters.departementCode)}`}
                  >
                    {filters.departementCode} —{" "}
                    {labelDepartement(filters.departementCode)}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove department filter"
                    onClick={() => pickDepartment(undefined)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </span>
              )}
              {filters.communeCode && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-slate-800 shadow-sm">
                  <span className="min-w-0 truncate" title={communeChipLabel}>
                    {communeChipLabel}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove commune filter"
                    onClick={() => pickCommune(undefined)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        <div>
          <label className={labelRow} htmlFor="explore-region">
            Region
          </label>
          <LocationCombobox
            id="explore-region"
            options={regionComboboxOptions}
            value={filters.regionCode}
            onChange={pickRegion}
            placeholder={
              loadingRegions ? "Loading regions…" : "Search or select a region…"
            }
            disabled={loadingRegions}
            emptyHint="No region matches"
          />
        </div>

        {filters.regionCode && (
          <div>
            <label className={labelRow} htmlFor="explore-dept">
              Department
            </label>
            <LocationCombobox
              id="explore-dept"
              options={departmentComboboxOptions}
              value={filters.departementCode}
              onChange={pickDepartment}
              placeholder="Search or select a department…"
              disabled={loadingDepts && departmentOptions.length === 0}
              emptyHint="No department matches"
            />
          </div>
        )}

        {filters.departementCode && (
          <div>
            <label className={labelRow} htmlFor="explore-commune">
              Commune
            </label>
            <LocationCombobox
              id="explore-commune"
              options={communeComboboxOptions}
              value={filters.communeCode}
              onChange={pickCommune}
              placeholder="Search or select a commune…"
              disabled={loadingCommunes && communeOptions.length === 0}
              emptyHint="No commune matches"
            />
          </div>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={() => resetFilters()}
            className={savedPolyPillBtnWideNeutral}
          >
            <RotateCcw size={14} />
            Reset all filters
          </button>
        )}
      </div>
    </div>
  );
}
