import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AreaUnit } from "@/services/areaFormat";

interface AreaUnitState {
  areaUnit: AreaUnit;
  setAreaUnit: (u: AreaUnit) => void;
}

export const useAreaUnitStore = create<AreaUnitState>()(
  persist(
    (set) => ({
      areaUnit: "hectares",
      setAreaUnit: (areaUnit) => set({ areaUnit }),
    }),
    { name: "forest-bd-area-unit" },
  ),
);
