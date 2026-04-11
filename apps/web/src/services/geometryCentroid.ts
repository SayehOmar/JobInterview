/**
 * Representative [lng, lat] inside a drawn Polygon / MultiPolygon for WMS GetFeatureInfo sampling.
 */

type Ring = number[][];

function centroidOfRing(ring: Ring): [number, number] {
    let sx = 0;
    let sy = 0;
    const n = ring.length;
    if (n === 0) return [0, 0];
    for (const pt of ring) {
        sx += pt[0];
        sy += pt[1];
    }
    return [sx / n, sy / n];
}

export function getPolygonGeometryCentroid(geometry: {
    type?: string;
    coordinates?: unknown;
}): [number, number] | null {
    const t = geometry?.type;
    const c = geometry?.coordinates;
    if (!t || !c) return null;

    if (t === 'Polygon' && Array.isArray(c) && c.length > 0) {
        const outer = c[0] as Ring;
        if (!Array.isArray(outer) || outer.length === 0) return null;
        return centroidOfRing(outer);
    }

    if (t === 'MultiPolygon' && Array.isArray(c) && c.length > 0) {
        const firstPoly = c[0] as Ring[];
        if (!Array.isArray(firstPoly) || firstPoly.length === 0) return null;
        const outer = firstPoly[0] as Ring;
        if (!Array.isArray(outer) || outer.length === 0) return null;
        return centroidOfRing(outer);
    }

    return null;
}
