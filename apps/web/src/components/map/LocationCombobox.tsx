"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { estimatedComboboxMinWidthPx } from "@/services/comboboxContentWidth";

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
  /** Hide inline clear when parent shows filter chips */
  hideInlineClear?: boolean;
};

export function LocationCombobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  emptyHint = "No match",
  hideInlineClear = false,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  /** Full trigger row (input + optional clear) — menu aligns to this width. */
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
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

  const showClear = Boolean(value) && !disabled && !hideInlineClear;

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => norm(o.label).includes(q) || norm(o.value).includes(q),
    );
  }, [options, query]);

  const labelMinWidthPx = useMemo(
    () =>
      estimatedComboboxMinWidthPx([
        ...options.map((o) => o.label),
        placeholder,
      ]),
    [options, placeholder],
  );

  /** Shrink-wrap to longest option (+ clear button when visible). */
  const controlMaxWidthPx = useMemo(() => {
    const clearSlack = showClear ? 40 : 0;
    return labelMinWidthPx + clearSlack;
  }, [labelMinWidthPx, showClear]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    let raf = 0;
    const compute = () => {
      const wrap = triggerRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const gap = 0;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const desiredTop = r.bottom + gap;
      const placeAbove = desiredTop + 220 > vh && r.top > vh / 4;
      const maxW = Math.max(120, vw - 16);
      const width = Math.min(
        maxW,
        Math.max(160, r.width > 1 ? r.width : controlMaxWidthPx),
      );
      let left = r.left;
      if (left + width > vw - 8) {
        left = vw - 8 - width;
      }
      left = Math.max(8, left);
      setMenuPos({
        left,
        top: placeAbove ? Math.max(8, r.top) : Math.max(8, desiredTop),
        width,
        placeAbove,
      });
    };
    compute();
    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, controlMaxWidthPx]);

  const openBelow = open && menuPos && !menuPos.placeAbove && !disabled;
  const openAbove = open && menuPos && menuPos.placeAbove && !disabled;

  const inputClass =
    "w-full min-w-0 border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 shadow-sm outline-none transition " +
    "placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0b4a59] focus:ring-2 focus:ring-[#0b4a59]/15 " +
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 " +
    (openBelow
      ? "rounded-t-md rounded-b-none border-b-0 "
      : openAbove
        ? "rounded-b-md rounded-t-none border-t-0 "
        : "rounded-md ");

  return (
    <div
      ref={rootRef}
      className="relative w-full min-w-0 max-w-full self-start"
      style={{ maxWidth: `${controlMaxWidthPx}px` }}
    >
      <div ref={triggerRef} className="flex min-w-0 gap-1.5">
        <div className="relative min-w-0 flex-1">
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
            className={inputClass}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={
                open
                  ? "rotate-180 transition-transform"
                  : "transition-transform"
              }
              aria-hidden
            />
          </span>
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>
      {open &&
        !disabled &&
        menuPos &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            className={
              "fixed z-9999 m-0 max-h-52 list-none overflow-y-auto overscroll-contain border border-slate-200 bg-white p-0 shadow-md " +
              (menuPos.placeAbove
                ? "rounded-t-md rounded-b-none border-b-0"
                : "rounded-b-md rounded-t-none border-t border-slate-100")
            }
            style={{
              left: menuPos.left,
              top: menuPos.placeAbove ? undefined : menuPos.top,
              bottom: menuPos.placeAbove
                ? Math.max(8, window.innerHeight - menuPos.top)
                : undefined,
              width: menuPos.width,
            }}
          >
            {filtered.length === 0 ? (
              <li className="list-none px-3 py-2.5 text-xs text-slate-500">
                {emptyHint}
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.value} className="list-none">
                  <button
                    type="button"
                    role="option"
                    className={
                      "flex w-full min-w-0 appearance-none items-center border-0 bg-transparent px-3 py-2.5 " +
                      "text-left text-sm leading-snug text-slate-800 shadow-none outline-none ring-0 " +
                      "transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 " +
                      "active:bg-slate-100"
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery(o.label);
                    }}
                  >
                    <span className="block truncate" title={o.label}>
                      {o.label}
                    </span>
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
