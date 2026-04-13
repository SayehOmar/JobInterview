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
          <button
            key={item.id}
            type="button"
            role="tab"
            title={item.name}
            onClick={() => onSelect(item.id)}
            className="group relative flex min-w-0 flex-col items-center px-1 transition-[transform] duration-200 ease-out will-change-transform hover:z-10 hover:scale-[1.14] active:scale-100"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 shadow-md ring-1 ring-black/10 transition-[box-shadow] duration-200 group-hover:shadow-lg group-hover:ring-[#0b4a59]/30">
              <Trees size={20} className="text-[#0b4a59]" strokeWidth={2} />
            </span>
            <span className="mt-1 max-w-[5.5rem] truncate text-center text-[10px] font-medium leading-tight text-white drop-shadow-md">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
