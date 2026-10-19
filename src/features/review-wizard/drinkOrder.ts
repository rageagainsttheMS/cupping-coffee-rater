import type { ReferenceDrink } from "@/domain/reference";

/** The drinks most people order, in the order they lead the list. Matches `drinks.slug`. */
export const POPULAR_DRINK_SLUGS = ["latte", "flat_white", "cappuccino", "long_black"] as const;

const CAFE_FAVOURITES = 4;
const USUAL_DRINKS = 3;
const FALLBACK_PRIMARY = 8;

type Counts = Readonly<Record<number, number>>;

function byCountDesc(drinks: readonly ReferenceDrink[], counts: Counts): ReferenceDrink[] {
  return drinks
    .filter((d) => (counts[d.id] ?? 0) > 0)
    .sort((a, b) => counts[b.id] - counts[a.id] || a.sortOrder - b.sortOrder);
}

/**
 * Drinks for step 2: the popular ones first, then this cafe's most-rated others, then the person's
 * usual drinks, with everything else behind "More…". A drink never appears twice.
 */
export function orderDrinks(
  drinks: readonly ReferenceDrink[],
  cafeCounts: Counts,
  usualCounts: Counts,
  popularSlugs: readonly string[] = POPULAR_DRINK_SLUGS,
): { primary: ReferenceDrink[]; more: ReferenceDrink[] } {
  const inOrder = [...drinks].sort((a, b) => a.sortOrder - b.sortOrder);
  const seen = new Set<number>();
  const primary: ReferenceDrink[] = [];
  const add = (list: readonly ReferenceDrink[]) => {
    for (const drink of list) {
      if (!seen.has(drink.id)) {
        seen.add(drink.id);
        primary.push(drink);
      }
    }
  };

  add(popularSlugs.flatMap((slug) => inOrder.filter((d) => d.slug === slug)));
  add(byCountDesc(inOrder, cafeCounts).slice(0, CAFE_FAVOURITES));
  add(byCountDesc(inOrder, usualCounts).slice(0, USUAL_DRINKS));
  if (primary.length === 0) add(inOrder.slice(0, FALLBACK_PRIMARY));

  return { primary, more: inOrder.filter((d) => !seen.has(d.id)) };
}
