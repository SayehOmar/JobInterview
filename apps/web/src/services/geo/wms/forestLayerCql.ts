import type { MapFilters } from "@/store/mapStore";
import { departementsForRegion } from "@/services/admin/frInseeAdmin";
import { DEPARTEMENT_NAMES } from "@/services/admin/frDepartmentNames";

const Q = (s: string) => s.replace(/'/g, "''");

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * BD Forêt WMS features use `name` / `layer` (e.g. "calvados", "seine maritime") — not code_region.
 * Build CQL that matches those text fields using département labels.
 */
function forestNameVariantsForDept(code: string): string[] {
  const label = DEPARTEMENT_NAMES[code];
  if (!label) return [];
  const nfd = stripDiacritics(label).toLowerCase();
  const hyphen = nfd.replace(/\s+/g, "-");
  const space = nfd.replace(/-/g, " ");
  return [...new Set([hyphen, space].filter(Boolean))];
}

function cqlNameLayerOr(deptCode: string): string | undefined {
  const vars = forestNameVariantsForDept(deptCode);
  if (vars.length === 0) return undefined;
  const clauses: string[] = [];
  for (const v of vars) {
    const q = Q(v);
    clauses.push(`name='${q}'`);
    clauses.push(`layer='${q}'`);
  }
  return `(${clauses.join(" OR ")})`;
}

/** Shorter CQL for a whole région: IN lists instead of chaining many ORs. */
function cqlNameLayerIn(deptCodes: string[]): string | undefined {
  const names = new Set<string>();
  for (const c of deptCodes) {
    for (const v of forestNameVariantsForDept(c)) {
      names.add(v);
    }
  }
  const arr = [...names];
  if (arr.length === 0) return undefined;
  const quoted = arr.map((n) => `'${Q(n)}'`);
  return `(name IN (${quoted.join(",")}) OR layer IN (${quoted.join(",")}))`;
}

/**
 * CQL for prod:forest — only when we can match `name`/`layer` from INSEE département.
 * Commune-level filter reuses département scope (BD Forêt has no commune code on features).
 */
export function buildForestLayerCql(filters: MapFilters): string | undefined {
  const { regionCode, departementCode } = filters;

  if (departementCode) {
    return cqlNameLayerOr(departementCode);
  }

  if (regionCode) {
    const depts = departementsForRegion(regionCode);
    return cqlNameLayerIn(depts);
  }

  return undefined;
}

