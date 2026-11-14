import Supercluster from "supercluster";
import { scoreBand } from "@/domain/rating";
import type { Bbox } from "./geo";
import type { MapCafe } from "./types";

/**
 * - `rated`: the selected metric has a score.
 * - `new`: the cafe has ratings, but this metric has fewer than 3.
 * - `rate_first`: nobody has rated the cafe at all, an invitation to be first.
 */
export type PinKind = "rated" | "new" | "rate_first";

export function pinKind(cafe: MapCafe): PinKind {
  if (cafe.score !== null) return "rated";
  return cafe.has_ratings ? "new" : "rate_first";
}

/** Low scorers fade instead of disappearing, so people keep their bearings. */
export function isFaded(cafe: MapCafe): boolean {
  return scoreBand(cafe.score) === "low";
}

/** Pins closer than this many screen pixels are grouped. Kept small so cafes separate quickly. */
export const CLUSTER_RADIUS_PX = 40;
/** From the zoom after this, every cafe is its own pin. About street level in a busy suburb. */
export const CLUSTER_MAX_ZOOM = 14;

type PointProps = { cafeId: string; score: number | null; rank: number | null };
/** `best` is the shown score of the cafe with the highest `bestRank`. */
type ClusterProps = { count: number; best: number | null; bestRank: number | null };

export type ClusterIndex = {
  supercluster: Supercluster<PointProps, ClusterProps>;
  cafes: Map<string, MapCafe>;
};

export type MapItem =
  | { kind: "cluster"; id: number; lat: number; lng: number; count: number; best: number | null }
  | { kind: "cafe"; cafe: MapCafe };

/**
 * Groups nearby cafes. Each cluster carries how many cafes it holds and the score of its best
 * cafe, where best means the highest rank score.
 */
export function buildClusterIndex(cafes: readonly MapCafe[]): ClusterIndex {
  const supercluster = new Supercluster<PointProps, ClusterProps>({
    radius: CLUSTER_RADIUS_PX,
    maxZoom: CLUSTER_MAX_ZOOM,
    map: (props) => ({ count: 1, best: props.score, bestRank: props.rank }),
    reduce: (accumulated, props) => {
      accumulated.count += props.count;
      if (
        props.bestRank !== null &&
        (accumulated.bestRank === null || props.bestRank > accumulated.bestRank)
      ) {
        accumulated.best = props.best;
        accumulated.bestRank = props.bestRank;
      }
    },
  });
  supercluster.load(
    cafes.map((cafe) => ({
      type: "Feature" as const,
      properties: { cafeId: cafe.id, score: cafe.score, rank: cafe.rank_score },
      geometry: { type: "Point" as const, coordinates: [cafe.lng, cafe.lat] },
    })),
  );
  return { supercluster, cafes: new Map(cafes.map((cafe) => [cafe.id, cafe])) };
}

/** The clusters and single cafes to draw for a box at a zoom level. */
export function getMapItems(index: ClusterIndex, bbox: Bbox, zoom: number): MapItem[] {
  const items: MapItem[] = [];
  for (const feature of index.supercluster.getClusters(bbox, zoom)) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    if ("cluster" in props && props.cluster) {
      items.push({
        kind: "cluster",
        id: props.cluster_id,
        lat,
        lng,
        count: props.count,
        best: props.best,
      });
    } else {
      const cafe = index.cafes.get((props as PointProps).cafeId);
      if (cafe) items.push({ kind: "cafe", cafe });
    }
  }
  return items;
}

/** The zoom at which a tapped cluster breaks up. */
export function clusterExpansionZoom(index: ClusterIndex, clusterId: number): number {
  return index.supercluster.getClusterExpansionZoom(clusterId);
}
