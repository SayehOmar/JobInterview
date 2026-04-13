/**
 * INSEE région (2 digits, 2016 boundaries) → département codes (incl. 2A/2B, DROM 971+).
 * Used when GraphQL departements() has no rows (empty forest_plots).
 */
export const REGION_TO_DEPARTEMENTS: Record<string, string[]> = {
  "11": ["75", "77", "78", "91", "92", "93", "94", "95"],
  "24": ["18", "28", "36", "37", "41", "45"],
  "27": ["21", "25", "39", "58", "70", "71", "89", "90"],
  "28": ["14", "27", "50", "61", "76"],
  "32": ["02", "59", "60", "62", "80"],
  "44": ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  "52": ["44", "49", "53", "72", "85"],
  "53": ["22", "29", "35", "56"],
  "75": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
  "76": ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
  "84": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  "93": ["04", "05", "06", "13", "83", "84"],
  "94": ["2A", "2B"],
  "01": ["971"],
  "02": ["972"],
  "03": ["973"],
  "04": ["974"],
  "06": ["976"],
};

export function departementsForRegion(regionCode: string): string[] {
  return [...(REGION_TO_DEPARTEMENTS[regionCode] ?? [])];
}

function deptSortKey(code: string): string {
  if (code === "2A" || code === "2B") return code;
  const n = parseInt(code, 10);
  if (!Number.isNaN(n)) return n.toString().padStart(2, "0");
  return code;
}

export function sortDepartementCodes(codes: string[]): string[] {
  return [...new Set(codes)].sort((a, b) =>
    deptSortKey(a).localeCompare(deptSortKey(b), "fr", { numeric: true }),
  );
}
