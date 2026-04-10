export type MapProviderId = 'mapbox' | 'maplibre';

export type MapStyleKey = 'satellite' | 'streets' | 'terrain' | 'light' | 'dark';

export type ProviderChoice = 'auto' | MapProviderId;

type MapInitArgs = {
  container: HTMLElement;
  center: [number, number];
  zoom: number;
  styleKey: MapStyleKey;
};

export type MapRuntime = {
  provider: MapProviderId;
  map: any;
  draw: any;
  setBaseStyle: (styleKey: MapStyleKey) => void;
};

const MAPBOX_STYLES: Record<MapStyleKey, string> = {
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  streets: 'mapbox://styles/mapbox/streets-v12',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

function cartoRasterStyle(styleKey: MapStyleKey) {
  const tiles =
    styleKey === 'dark'
      ? ['https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png']
      : styleKey === 'light'
        ? ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png']
        : ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];

  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles,
        tileSize: 256,
        attribution:
          styleKey === 'dark' || styleKey === 'light'
            ? '© OpenStreetMap contributors, © CARTO'
            : '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
      },
    ],
  };
}

function resolveProviderChoice(explicitChoice: ProviderChoice): ProviderChoice {
  if (explicitChoice === 'mapbox' || explicitChoice === 'maplibre') return explicitChoice;
  return 'auto';
}

function hasMapboxToken(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
}

async function createMapboxRuntime(args: MapInitArgs): Promise<MapRuntime> {
  const [{ default: mapboxgl }, { default: MapboxDraw }] = await Promise.all([
    import('mapbox-gl'),
    import('@mapbox/mapbox-gl-draw'),
  ]);

  // Mapbox GL throws if token missing; we set only if present.
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

  const map = new mapboxgl.Map({
    container: args.container,
    style: MAPBOX_STYLES[args.styleKey],
    center: args.center,
    zoom: args.zoom,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: { polygon: true, trash: true },
    defaultMode: 'simple_select',
  });
  map.addControl(draw, 'top-right');

  return {
    provider: 'mapbox',
    map,
    draw,
    setBaseStyle: (styleKey) => map.setStyle(MAPBOX_STYLES[styleKey]),
  };
}

async function createMapLibreRuntime(args: MapInitArgs): Promise<MapRuntime> {
  const [{ default: maplibregl }, { default: MapboxDraw }] = await Promise.all([
    import('maplibre-gl'),
    import('@mapbox/mapbox-gl-draw'),
  ]);

  const map = new maplibregl.Map({
    container: args.container,
    style: cartoRasterStyle(args.styleKey),
    center: args.center,
    zoom: args.zoom,
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  map.addControl(new maplibregl.FullscreenControl(), 'top-right');

  // MapboxDraw is API-compatible with MapLibre in most cases (same style spec + handlers).
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: { polygon: true, trash: true },
    defaultMode: 'simple_select',
  });
  map.addControl(draw, 'top-right');

  return {
    provider: 'maplibre',
    map,
    draw,
    setBaseStyle: (styleKey) => map.setStyle(cartoRasterStyle(styleKey)),
  };
}

export async function createMapRuntime(args: MapInitArgs): Promise<MapRuntime> {
  const choice = resolveProviderChoice((process.env.NEXT_PUBLIC_MAP_PROVIDER as ProviderChoice) ?? 'auto');

  // Auto mode: prefer Mapbox if a token exists; otherwise MapLibre.
  if (choice === 'mapbox' || (choice === 'auto' && hasMapboxToken())) {
    try {
      return await createMapboxRuntime(args);
    } catch {
      // fall through to MapLibre
    }
  }

  return await createMapLibreRuntime(args);
}

