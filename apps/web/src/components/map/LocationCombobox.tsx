"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export type ComboboxOption = { value: string; label: string };

type LocationComboboxProps = {
  id?: string;
  options: ComboboxOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  disabled?: boolean;
  emptyHint?: string;
};

export function LocationCombobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  emptyHint = "No match",
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top: number;
    width: number;
    placeAbove: boolean;
  } | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );
  const selectedLabel = selected?.label ?? "";

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [value, selectedLabel, open]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => norm(o.label).includes(q) || norm(o.value).includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const compute = () => {
      const wrap = inputWrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const gap = 4;
      const vh = window.innerHeight;
      const desiredTop = r.bottom + gap;
      const placeAbove = desiredTop + 240 > vh && r.top > vh / 3;
      setMenuPos({
        left: Math.max(8, r.left),
        top: placeAbove ? Math.max(8, r.top - gap) : Math.max(8, desiredTop),
        width: Math.max(160, r.width),
        placeAbove,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, query, options.length]);

  const showClear = Boolean(value) && !disabled;

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <div className="flex min-w-0 gap-1">
        <div ref={inputWrapRef} className="relative min-w-0 flex-1">
          <input
            id={id}
            type="text"
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={open ? query : selectedLabel}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setQuery(selectedLabel);
            }}
            className="w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-8 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#0b4a59] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <ChevronHint />
        </div>
        {showClear && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setOpen(false);
              setQuery("");
            }}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>
      {open &&
        !disabled &&
        menuPos &&
        createPortal(
          <ul
            role="listbox"
            className="fixed z-9999 max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{
              left: menuPos.left,
              top: menuPos.placeAbove
                ? undefined
                : menuPos.top,
              bottom: menuPos.placeAbove
                ? Math.max(8, window.innerHeight - menuPos.top)
                : undefined,
              width: menuPos.width,
            }}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-500">{emptyHint}</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    className="w-full min-w-0 truncate whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery(o.label);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}

function ChevronHint() {
  return (
    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="rotate-90"
        aria-hidden
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  );
}
