# Polygon analysis — service boundary (Part 3)

This folder implements **Option A: a service-ready API boundary** for **polygon analysis** in the Forest BD Viewer app. It is the single place UI and other features should depend on for “what does this polygon mean in terms of BD Forêt v2 / forest metrics?” — without importing WFS helpers, snapshot builders, or display math directly.

---

## What boundary we chose

**Domain:** polygon-level forest analysis — combining:

- a **location snapshot** for a drawn geometry (WMS GetFeatureInfo where applicable, BD Forêt v2 via WFS in `buildLocationContextFromDrawnGeometry`), and  
- **derived metrics** for the analysis UI: forest overlap (ha), coverage %, TFV-class rows, plot counts.

The **public contract** is exported from this module (`polygonAnalysisClient.ts` re-exported via `index.ts`):

| Function | Role |
|----------|------|
| `refreshLocationContextForGeometry(geometry, map, saved?)` | Refreshes / merges `SavedLocationContext` for a polygon geometry (used when saving and when panels open). |
| `computePolygonAnalysis({ polygonAreaHa, analysisResults, locationContext })` | Pure(ish) step: turns stored context + optional saved analysis into **forest metrics** and **species/TFV rows** for display. |

Types `PolygonAnalysisComputed`, `PolygonAnalysisForestMetrics`, and `PolygonAnalysisSpeciesRow` describe the **outputs** consumers rely on.

---

## Why this domain

- **High coupling before:** React components and `ForestMap` reached into `locationContextSnapshot`, `polygonAnalysisDisplay`, and indirectly WFS overlap logic. Any change to IGN endpoints, field names, or aggregation rules risked touching many files.
- **Clear inputs/outputs:** Geometry + optional saved context in → structured analysis metrics out. That maps cleanly to a future HTTP or worker API.
- **User-visible:** Analysis panels and save flow are core product paths; stabilizing their contract improves reliability and testability.

---

## What coupling problem this reduces

- **Before:** UI knew *how* context was built (WFS bbox, merge rules, TFV breakdown) and *how* rows were derived (`buildEffectiveSpeciesRows`, `buildEffectiveForestCover`, parcel ha parsing).
- **After:** Callers depend only on **`refreshLocationContextForGeometry`** and **`computePolygonAnalysis`**. The rest of the app does not need to import low-level geo modules for those flows.

Current consumers include:

- `apps/web/src/components/map/ForestMap.tsx` (save polygon → snapshot)
- `apps/web/src/components/map/analysis/PolygonResultsPanel.tsx`
- `apps/web/src/components/map/analysis/ComparisonResultsPanel.tsx`

---

## Current implementation (in-process)

Today the boundary **delegates** to existing modules:

- `buildLocationContextFromDrawnGeometry` / `mergeLocationContext` from `@/services/geo/locationContextSnapshot`
- `buildEffectiveForestCover`, `buildEffectiveSpeciesRows`, `parseForestSurfaceHectares` from `@/services/geo/polygonAnalysisDisplay`

So the boundary is **real for consumers** (one import path, stable functions), while **infrastructure stays centralized** here until extraction.

---

## How this could evolve into an actual service

1. **Keep the same function signatures** (or a thin adapter) on the client.
2. **Move** `buildLocationContextFromDrawnGeometry` and WFS overlap work behind a **NestJS resolver or REST handler** (e.g. `POST /polygon-analysis/context` with GeoJSON body + optional `savedContext`).
3. **Replace** the bodies of `refreshLocationContextForGeometry` / `computePolygonAnalysis` with:
   - `fetch` to the API, or  
   - a generated GraphQL client.
4. **Optional:** run heavy WFS / PostGIS work in the API with **caching**, **rate limits**, and **single source of truth** for IGN field semantics.

Consumers (`ForestMap`, panels) would change **imports only if** you switch from sync `computePolygonAnalysis` to async network — or you keep a small `polygonAnalysisApi.ts` that mirrors today’s sync API with `await`.

---

## What remains tightly coupled (and why)

| Area | Why it’s still coupled |
|------|-------------------------|
| **`SavedLocationContext` shape** | Shared with persistence (`location_context` on polygons). Changing it affects GraphQL and DB. |
| **Mapbox `Map` in `refreshLocationContextForGeometry`** | GetFeatureInfo and layer queries need a live map; a remote service would take bbox/center + layer list instead. |
| **Implementation details inside this module** | Still calls `services/geo/*` until those are moved server-side. |
| **GraphQL saved `analysisResults`** | `computePolygonAnalysis` merges server-stored analysis with live context; the schema is owned by the API. |

These are acceptable for a **bounded prototype**; the boundary still gives a **single place** to swap implementation later.

---

## Summary

- **Boundary:** polygon analysis (context refresh + computed metrics/rows).  
- **Approach:** Option A — internal module as the **contract**; implementation can become remote without rewriting every screen.  
- **Next doc step (repo-level):** mirror this in the root/app README for evaluators who do not open `src/services/domains/`.
