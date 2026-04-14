"use client";

import { Trees } from "lucide-react";

export type DockBarItem = {
  id: string;
  name: string;
};

type AnalysisDockBarProps = {
  items: DockBarItem[];
  onSelect: (id: string) => void;
};

/**
 * Top-of-screen “taskbar” for minimized analysis windows — Mac dock–style hover scale.
 */
export function AnalysisDockBar({ items, onSelect }: AnalysisDockBarProps) {
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-[60] flex justify-center px-2 pt-2 pb-1">
      <div
        className="pointer-events-auto flex max-w-[min(100vw-1rem,42rem)] items-end justify-center gap-1 rounded-2xl border border-white/25 bg-gradient-to-b from-black/35 to-black/25 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
        role="tablist"
        aria-label="Minimized analyses"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative flex min-w-0 flex-col items-center"
          >
            {/* Only the circle is clickable */}
            <button
              type="button"
              role="tab"
              title={item.name}
              onClick={() => onSelect(item.id)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white/95 shadow-sm backdrop-blur transition-[transform,box-shadow,background-color,filter] duration-200 ease-out will-change-transform hover:z-10 hover:scale-[1.14] hover:bg-white/15 hover:shadow-md hover:drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)] active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <Trees size={20} className="text-emerald-200" strokeWidth={2} />
            </button>

            <span className="pointer-events-none mt-1 max-w-[10.5rem] truncate text-center text-[14px] font-semibold leading-tight text-white drop-shadow-md">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
