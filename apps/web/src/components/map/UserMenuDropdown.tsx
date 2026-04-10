'use client';

import { User, LogOut } from 'lucide-react';
import { mapDropdownHeaderClass, mapDropdownPanelClass } from './mapDropdownStyles';

interface UserMenuDropdownProps {
    userEmail?: string | null;
    onLogout: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserMenuDropdown({ userEmail, onLogout, open, onOpenChange }: UserMenuDropdownProps) {
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
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            onOpenChange(false);
                            onLogout();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                        <LogOut size={16} />
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
}
