const GEOSERVER_URL = "/geoserver";
const COMMUNE_TYPENAME = "prod:cummune";

const P_INSEE =
  process.env.NEXT_PUBLIC_WMS_COMMUNE_CODE_ATTR ?? "code_insee";
/** GeoServer commune layer uses this (not `code_departement`). */
const P_DEPT =
  process.env.NEXT_PUBLIC_WMS_COMMUNE_DEPT_ATTR ?? "code_insee_du_departement";

export type CommuneOption = { code: string; nom: string };

function parseFeatures(data: {
  features?: Array<{ properties?: Record<string, unknown> }>;
}): CommuneOption[] {
  const out: CommuneOption[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const raw =
      p[P_INSEE] ??
      p.code_insee ??
      p.CODE_INSEE ??
      p.insee ??
      p.code_insee_commune;
    if (raw == null || String(raw).trim() === "") continue;
    const code = String(raw).trim();
    const nomRaw =
      p.nom_officiel ??
      p.nom_officiel_en_majuscules ??
      p.NOM_OFFICIEL ??
      p.nom ??
      code;
    const nom = String(nomRaw);
    out.push({ code, nom });
  }
  out.sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }));
  return out;
}

async function wfsGetFeatures(cql: string): Promise<CommuneOption[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: COMMUNE_TYPENAME,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    count: "2000",
    cql_filter: cql,
  });
  const url = `${GEOSERVER_URL}/wfs?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{ properties?: Record<string, unknown> }>;
  };
  return parseFeatures(data);
}

/**
 * Communes in a département — tries CQL variants (attribute names differ by publish).
 */
export async function fetchCommunesForDepartment(
  departementCode: string,
): Promise<CommuneOption[]> {
  const q = departementCode.replace(/'/g, "''");

  const attempts = [
    `${P_DEPT}='${q}'`,
    `code_insee_du_departement='${q}'`,
    `code_departement='${q}'`,
    `code_insee LIKE '${q}%'`,
  ];

  for (const cql of attempts) {
    const rows = await wfsGetFeatures(cql);
    if (rows.length > 0) return rows;
  }

  return [];
}

/** @deprecated use fetchCommunesForDepartment */
export async function fetchCommuneCodesForDepartment(
  departementCode: string,
): Promise<string[]> {
  const rows = await fetchCommunesForDepartment(departementCode);
  return rows.map((r) => r.code);
}
