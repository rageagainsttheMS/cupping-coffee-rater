import type { Point, Region } from "./types";

/** West, south, east, north. */
export type Bbox = [number, number, number, number];

const METRES_PER_DEGREE_LAT = 111_320;
/** Query boxes snap outwards to this grid, so a small pan reuses the same query. */
const QUERY_GRID_DEGREES = 0.005;
/** Google searches are logged per tile this size. Matches the server's tiles. */
const TILES_PER_DEGREE = 100;
/** A phone is taller than wide, so a view is about this much taller than it is wide. */
const PORTRAIT_ASPECT = 1.8;

export function regionToBbox(region: Region): Bbox {
  return [
    region.longitude - region.longitudeDelta / 2,
    region.latitude - region.latitudeDelta / 2,
    region.longitude + region.longitudeDelta / 2,
    region.latitude + region.latitudeDelta / 2,
  ];
}

/** The web map zoom level for a region, from how many degrees of longitude it spans. */
export function regionToZoom(region: Region): number {
  const zoom = Math.round(Math.log2(360 / region.longitudeDelta));
  return Math.min(20, Math.max(0, zoom));
}

export function regionAtZoom(center: Point, zoom: number): Region {
  const longitudeDelta = 360 / 2 ** zoom;
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: longitudeDelta * PORTRAIT_ASPECT,
    longitudeDelta,
  };
}

/** Straight-line distance in metres. Accurate enough for "350 m away". */
export function distanceMetres(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * METRES_PER_DEGREE_LAT;
  const dLng = (b.lng - a.lng) * METRES_PER_DEGREE_LAT * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** Grows a box outwards to the query grid. */
export function roundBbox([west, south, east, north]: Bbox): Bbox {
  const down = (n: number) => Math.floor(n / QUERY_GRID_DEGREES + 1e-9) * QUERY_GRID_DEGREES;
  const up = (n: number) => Math.ceil(n / QUERY_GRID_DEGREES - 1e-9) * QUERY_GRID_DEGREES;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return [round(down(west)), round(down(south)), round(up(east)), round(up(north))];
}

/** Which Google search tile a region's centre falls in. */
export function searchTileKey(region: Region): string {
  return `${Math.floor(region.latitude * TILES_PER_DEGREE)}:${Math.floor(region.longitude * TILES_PER_DEGREE)}`;
}
