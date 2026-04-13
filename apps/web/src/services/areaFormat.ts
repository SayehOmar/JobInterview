/** User-facing area units (stored preference). */
export type AreaUnit = "hectares" | "metric" | "imperial";

/** 1 hectare in international acres */
export const ACRES_PER_HECTARE = 2.471053814671653;

/**
 * Format a land area given in **hectares** for display.
 * - `hectares`: always "X.XX ha"
 * - `metric`: square metres (whole m²) for land parcels
 * - `imperial`: acres (2 decimal places)
 */
export function formatArea(ha: number, unit: AreaUnit): string {
  if (!Number.isFinite(ha) || ha < 0) return "—";
  if (unit === "hectares") {
    return `${ha.toFixed(2)} ha`;
  }
  if (unit === "imperial") {
    const ac = ha * ACRES_PER_HECTARE;
    return `${ac.toFixed(2)} ac`;
  }
  const m2 = ha * 10000;
  const rounded = Math.round(m2);
  return `${rounded.toLocaleString()} m²`;
}
