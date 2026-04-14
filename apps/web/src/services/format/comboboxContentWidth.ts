/**
 * Rough width for `text-sm` labels in the location combobox (system UI font).
 * Longest INSEE région name is "Provence-Alpes-Côte d'Azur" (28 chars).
 */
const CHAR_PX_AT_14 = 7.45;
const EXTRA_PAD_PX = 52; // pl-3 pr-9 + chevron + borders

export function estimatedComboboxMinWidthPx(
  labels: string[],
  opts?: { min?: number; max?: number },
): number {
  const min = opts?.min ?? 160;
  const max = opts?.max ?? 640;
  if (labels.length === 0) return min;
  let longest = 0;
  for (const l of labels) {
    longest = Math.max(longest, l.length);
  }
  return Math.min(
    max,
    Math.max(min, Math.ceil(longest * CHAR_PX_AT_14) + EXTRA_PAD_PX),
  );
}

