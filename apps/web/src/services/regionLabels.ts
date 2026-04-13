/**
 * INSEE région codes → display names (metro + DROM).
 * Used as a fallback when the API has no regions yet (e.g. empty forest_plots).
 */
export const INSEE_REGION_LABELS: Record<string, string> = {
  "11": "Île-de-France",
  "24": "Centre-Val de Loire",
  "27": "Bourgogne-Franche-Comté",
  "28": "Normandie",
  "32": "Hauts-de-France",
  "44": "Grand Est",
  "52": "Pays de la Loire",
  "53": "Bretagne",
  "75": "Nouvelle-Aquitaine",
  "76": "Occitanie",
  "84": "Auvergne-Rhône-Alpes",
  "93": "Provence-Alpes-Côte d'Azur",
  "94": "Corse",
  "01": "Guadeloupe",
  "02": "Martinique",
  "03": "Guyane",
  "04": "La Réunion",
  "06": "Mayotte",
};

/** Sorted list for Explore-area dropdown when GraphQL `regions` is empty. */
export const FALLBACK_REGION_CODES = Object.keys(INSEE_REGION_LABELS).sort((a, b) =>
  a.localeCompare(b, "fr"),
);

export function labelForRegionCode(code: string): string {
  return INSEE_REGION_LABELS[code] ?? `Région ${code}`;
}

/** Approximate geographic center + zoom when user picks a région (INSEE). */
export const REGION_NAV: Record<string, { lat: number; lng: number; zoom: number }> = {
  "11": { lat: 48.85, lng: 2.35, zoom: 7.5 },
  "24": { lat: 47.55, lng: 1.75, zoom: 7 },
  "27": { lat: 47.32, lng: 5.04, zoom: 7 },
  "28": { lat: 49.18, lng: 0.37, zoom: 7 },
  "32": { lat: 50.28, lng: 3.97, zoom: 7 },
  "44": { lat: 48.7, lng: 6.2, zoom: 7 },
  "52": { lat: 47.76, lng: -0.33, zoom: 7 },
  "53": { lat: 48.2, lng: -2.8, zoom: 7 },
  "75": { lat: 44.85, lng: -0.6, zoom: 6.8 },
  "76": { lat: 43.65, lng: 2.5, zoom: 7 },
  "84": { lat: 45.45, lng: 4.8, zoom: 7 },
  "93": { lat: 43.95, lng: 6.1, zoom: 7 },
  "94": { lat: 42.15, lng: 9.15, zoom: 8 },
  "01": { lat: 16.25, lng: -61.58, zoom: 9 },
  "02": { lat: 14.64, lng: -61.02, zoom: 9 },
  "03": { lat: 5.0, lng: -53.0, zoom: 7 },
  "04": { lat: -21.13, lng: 55.55, zoom: 9 },
  "06": { lat: -12.78, lng: 45.23, zoom: 10 },
};
