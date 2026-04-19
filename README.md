# Forest BD Viewer

Full-stack geospatial application (Next.js + NestJS + GraphQL + PostgreSQL/PostGIS) for exploring forest data, filters, and user-drawn polygon analysis.

This repository is an **evolution** of the upstream starter ([`TALHA017/forest-bd-viewer`](https://github.com/TALHA017/forest-bd-viewer)), hardened for reliability and aligned with a **Symbiose-style full-stack technical exercise** (product hardening + one service-boundary step). The brief’s three parts are addressed below.

---

## Monorepo layout

| Path | Role |
|------|------|
| `apps/web` | Next.js (App Router), Apollo Client, Mapbox/MapLibre, map UI |
| `apps/api` | NestJS, GraphQL (Apollo), JWT auth, TypeORM |
| `packages/database` | Shared TypeORM entities (`User`, `ForestPlot`, `UserPolygon`, `PolygonFolder`, …) |
| `docker/` | Dockerfiles for API and web |
| `docker-compose.yml` | Postgres (PostGIS) + API + web |

Root scripts use **Turborepo**: `npm run dev`, `npm run build`, `npm run lint`.

---

## Quick start (local development)

### Prerequisites

- **Node.js** (LTS, e.g. 20+)
- **PostgreSQL with PostGIS** running locally (same major version as in Docker is ideal)
- **npm** (workspaces at repo root)

### Environment

1. Copy env templates and adjust:
   - **`apps/api/.env.example`** → `apps/api/.env`
   - Optionally a **repo-root** `.env` if you use tools that expect it (Compose reads root `.env` for variable substitution when you use Docker).

2. Typical **`apps/api/.env`** variables:

   - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`
   - `JWT_SECRET`, `JWT_EXPIRATION`
   - `NODE_ENV=development` (enables TypeORM `synchronize` in dev for schema sync)

3. **`apps/web`**: set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4000/graphql`) and optional `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_MAP_PROVIDER` — see `apps/web/.env.example`.

### Install and run

```bash
npm install
npm run dev
```

- Web: [http://localhost:3000](http://localhost:3000)  
- API GraphQL: [http://localhost:4000/graphql](http://localhost:4000/graphql)

### Production build (local)

```bash
npm run build
```

---

## Docker

### Full stack (PostGIS + API + web)

From the repo root:

```bash
docker compose up --build
```

- **Database image** is **`postgis/postgis`** (not plain `postgres`), because entities use **`geometry`** columns.
- API uses `DATABASE_SYNCHRONIZE=true` in Compose so tables are created on first boot in the container DB. For production, prefer migrations and turn sync off.
- **JWT / secrets**: Compose interpolates **`JWT_SECRET`** from a **repo-root `.env`** file if present (`JWT_SECRET: ${JWT_SECRET:-…}`). `apps/api/.env` alone is **not** used for that substitution unless you add `env_file` to the compose service.

### Use your existing Postgres on the host (same DB as `npm run dev`)

```bash
docker compose -f docker-compose.host-db.yml up --build
```

This overrides `DATABASE_HOST` to `host.docker.internal` and expects **`DATABASE_*` / `JWT_*`** compatible with your machine (see file header).

### Images vs `docker compose up`

Building creates **images**; **`docker compose up`** starts **containers** with the right **network, env, and dependencies**. Running a single image from Docker Desktop **Run** does **not** load `docker-compose.yml` — use **`docker compose up`** for this project.

---

## Part 1 — Technical review of the **original** codebase

The starter (as in the reference archive) already did several things **well**:

- Sensible **monorepo** split (web / API / shared entities).
- **TypeScript** end-to-end, **GraphQL**, **PostGIS-oriented** `forestPlots` queries, **JWT** auth, map UI with filters and WMS.
- **User map state** fields and persistence mutation.
- UI work toward polygons and analysis.

**Main weaknesses and risks** in that baseline:

1. **Broken end-to-end polygon flow** — The UI and `UserPolygon` entity existed, but the **published GraphQL schema** had **no** `savePolygon` / `myPolygons` (and related) operations; TypeORM did not register polygon entities. The main save/list flow could not succeed.
2. **Contract drift** — e.g. **`ANALYZE_POLYGON`** in the web client without a matching server mutation; `MapStateInput` / client payloads not fully aligned.
3. **Config & ops** — Fragile env usage, Mapbox-only assumptions, no **Docker** story; WMS layer typo (`cummune`), hardcoded regions vs API-driven admin data.

**Top 3 priorities** we addressed first: (1) make polygon persistence real and aligned with GraphQL, (2) align API/client contracts and typing, (3) harden runtime (Map fallback, CORS/host for containers, build) and add Docker.




---

## Part 2 — What we changed (product & engineering)

Aligned with the exercise’s mandatory themes:

1. **End-to-end consistency** — Polygon **save / list / folders / reorder / reanalyze / delete** on the API; **`@forest/database`** wired in the API; **`MapStateInput`** includes **`activeLayers`** where needed; orphan client-only mutations replaced by coherent flows.
2. **Geospatial loading & filtering** — WMS/WFS organization under `apps/web/src/services/geo/`, **IGN** proxies in `next.config`, **CQL** and layer UX, **BD Forêt v2** WFS overlap and class breakdown with zoom-aware / cancellable fetches; filter panel backed by **typed GraphQL** for regions/départements/communes.
3. **Persisted workspace / user state** — Analysis dock persistence, BD Forêt TFV color/visibility preferences, map provider abstraction (**Mapbox** + **MapLibre** fallback).
4. **Code quality** — Clearer **map component** folders, extracted **geometry/display** helpers, **TypeScript/build** fixes across packages.

---

## Part 3 — Service-boundary transition (bounded extraction)

**Chosen boundary:** **Polygon analysis** (BD Forêt context, location snapshot, derived metrics for the UI).

**Implementation (Option A — service-ready, in-process):**

- Module: `apps/web/src/services/domains/polygonAnalysis/`
- Public entry points: `refreshLocationContextForGeometry`, `computePolygonAnalysis` (see **`apps/web/src/services/domains/polygonAnalysis/README.md`** for why, coupling reduced, and how this could become an HTTP service later).

---

