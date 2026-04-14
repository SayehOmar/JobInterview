/** Shared control styling — folder pill is the reference for text actions */

/** Border radius: 15% (matches product request for pill-shaped actions) */
const R15 = "rounded-[15%]";

/** Text + icon actions (e.g. New folder) — white pill, teal label */
export const savedPolyPillBtn = `${R15} inline-flex shrink-0 items-center justify-center gap-1.5 border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#0b4a59] shadow-md transition hover:bg-gray-50 active:scale-[0.98]`;

/** Primary filled (e.g. Add folder submit) */
export const savedPolyPillBtnPrimary = `${R15} inline-flex shrink-0 items-center justify-center border border-[#0b4a59]/30 bg-[#0b4a59] px-4 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-95 active:scale-[0.98]`;

/** Full-width muted (e.g. “tap to expand”, layer strip) — same chrome as folder, neutral colors */
export const savedPolyPillBtnWideMuted = `${R15} flex w-full items-start border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium leading-snug text-gray-600 shadow-md transition hover:bg-gray-100 active:scale-[0.98]`;

/** Full-width centered (e.g. Reset filters) */
export const savedPolyPillBtnWideNeutral = `${R15} flex w-full items-center justify-center gap-2 border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition hover:bg-gray-200 active:scale-[0.98]`;

/** Destructive / session (e.g. Log out) — same pill family as folder */
export const savedPolyPillBtnDanger = `${R15} flex w-full items-center gap-2 border border-red-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-red-600 shadow-md transition hover:bg-red-50 active:scale-[0.98]`;

/** Secondary outline (e.g. Close analysis) */
export const savedPolyPillBtnOutline = `${R15} w-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-md transition hover:bg-gray-50 active:scale-[0.98]`;

/** Modal footer — paired Cancel / primary (flex row, equal width) */
export const savedPolyPillBtnNeutralRow = `${R15} flex min-h-0 min-w-0 flex-1 items-center justify-center gap-2 border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition hover:bg-gray-200 active:scale-[0.98]`;

export const savedPolyPillBtnPrimaryRow = `${R15} flex min-h-0 min-w-0 flex-1 items-center justify-center gap-2 border border-[#0b4a59]/30 bg-[#0b4a59] px-4 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50`;

export const savedPolyRoundBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 active:scale-[0.98]";

export const savedPolyRoundBtnTeal =
  savedPolyRoundBtn + " text-[#0b4a59] border-[#0b4a59]/20 hover:bg-[#0b4a59]/5";

export const savedPolyRoundBtnDanger =
  savedPolyRoundBtn + " text-red-600 border-red-100 hover:bg-red-50";

export const savedPolyRoundBtnMuted =
  savedPolyRoundBtn + " text-gray-500 border-gray-200 hover:text-[#0b4a59] hover:border-[#0b4a59]/25";
