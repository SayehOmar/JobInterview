import { REGION_NAV } from "@/services/regionLabels";

/**
 * Approximate préfecture fly-to for départements (sparse). Missing keys use
 * {@link getDepartmentFlyTo} fallback (zoom into parent région).
 */
export const DEPARTMENT_NAV: Partial<
  Record<string, { lat: number; lng: number; zoom: number }>
> = {
  "75": { lat: 48.8566, lng: 2.3522, zoom: 10 },
  "69": { lat: 45.764, lng: 4.8357, zoom: 9 },
  "13": { lat: 43.2965, lng: 5.3698, zoom: 9 },
  "59": { lat: 50.6292, lng: 3.0573, zoom: 9 },
  "33": { lat: 44.8378, lng: -0.5792, zoom: 9 },
  "31": { lat: 43.6047, lng: 1.4442, zoom: 9 },
  "67": { lat: 48.5734, lng: 7.7521, zoom: 9 },
  "44": { lat: 47.2184, lng: -1.5536, zoom: 9 },
  "76": { lat: 49.4431, lng: 1.0993, zoom: 9 },
  "35": { lat: 48.1173, lng: -1.6778, zoom: 9 },
  "974": { lat: -21.1151, lng: 55.5364, zoom: 10 },
  "971": { lat: 16.265, lng: -61.551, zoom: 9 },
  "972": { lat: 14.6161, lng: -61.0588, zoom: 9 },
  "973": { lat: 4.933, lng: -52.33, zoom: 7 },
  "976": { lat: -12.8275, lng: 45.1662, zoom: 11 },
};

export function getDepartmentFlyTo(
  deptCode: string,
  regionCode: string | undefined,
): { lat: number; lng: number; zoom: number } | null {
  const direct = DEPARTMENT_NAV[deptCode];
  if (direct) return direct;
  const r = regionCode ? REGION_NAV[regionCode] : undefined;
  if (!r) return null;
  return {
    lat: r.lat,
    lng: r.lng,
    zoom: Math.min(r.zoom + 1.6, 11),
  };
}
