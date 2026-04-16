'use client';

import { User, LogOut } from 'lucide-react';
import { mapDropdownHeaderClass, mapDropdownPanelClass } from '../mapDropdownStyles';
import { savedPolyPillBtnDanger } from '../saved/savedPolygonsUi';
import { useAreaUnitStore } from '@/store/areaUnitStore';
import type { AreaUnit } from '@/services/format/areaFormat';

const AREA_OPTIONS: { value: AreaUnit; label: string; hint: string }[] = [
    { value: 'hectares', label: 'Hectares (ha)', hint: 'Forestry standard in France' },
    { value: 'metric', label: 'Metric (m²)', hint: 'Square metres' },
    { value: 'imperial', label: 'Imperial (ac)', hint: 'Acres' },
];

interface UserMenuDropdownProps {
    userEmail?: string | null;
    onLogout: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserMenuDropdown({ userEmail, onLogout, open, onOpenChange }: UserMenuDropdownProps) {
    const areaUnit = useAreaUnitStore((s) => s.areaUnit);
    const setAreaUnit = useAreaUnitStore((s) => s.setAreaUnit);

    return (
        <div className="flex w-full flex-col items-end">
            <button
                type="button"
                aria-expanded={open}
                aria-label="Account"
                onClick={() => onOpenChange(!open)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 active:scale-[0.98] ${
                    open ? 'ring-2 ring-[#0b4a59] ring-offset-2' : ''
                }`}
            >
                <User size={22} className="text-[#0b4a59]" strokeWidth={2} />
            </button>

            {open && (
                <div className={`${mapDropdownPanelClass} mt-2 w-full overflow-hidden`} role="menu">
                    <div className={mapDropdownHeaderClass}>
                        <User size={18} className="shrink-0 text-[#0b4a59]" />
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">Account</h3>
                            <p className="text-xs text-gray-500">Profile and session</p>
                        </div>
                    </div>
                    {userEmail && (
                        <div className="border-b border-gray-100 px-3 py-2 text-xs text-gray-600">{userEmail}</div>
                    )}
                    <div className="border-b border-gray-100 px-3 py-2">
                        <p className="text-xs font-semibold text-gray-800">Area units</p>
                        <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
                            <span className="font-medium text-gray-600">ha</span> = hectare (10&nbsp;000&nbsp;m²). Used for forest parcels and overlap.
                        </p>
                        <div className="mt-2 flex flex-col gap-1.5" role="group" aria-label="Area unit">
                            {AREA_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                    className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-gray-50"
                                >
                                    <input
                                        type="radio"
                                        name="area-unit"
                                        className="mt-0.5"
                                        checked={areaUnit === opt.value}
                                        onChange={() => setAreaUnit(opt.value)}
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-xs font-medium text-gray-800">{opt.label}</span>
                                        <span className="block text-[10px] text-gray-500">{opt.hint}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="px-3 pb-3 pt-1">
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                onOpenChange(false);
                                onLogout();
                            }}
                            className={savedPolyPillBtnDanger}
                        >
                            <LogOut size={16} strokeWidth={2} />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
