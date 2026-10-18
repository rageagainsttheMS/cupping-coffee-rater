import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import type { ReferenceData } from "@/domain/reference";
import { loadReferenceData } from "./referenceDataLoader";
import { referenceDataSnapshot } from "./referenceDataSnapshot";
import { supabase } from "./supabase";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function fetchRemote(): Promise<ReferenceData> {
  const [tags, drinks] = await Promise.all([
    supabase.from("tags").select("id, metric, label, sort_order, active"),
    supabase
      .from("drinks")
      .select("id, slug, name, drink_group, counts_toward_coffee, sort_order, active"),
  ]);
  if (tags.error) throw tags.error;
  if (drinks.error) throw drinks.error;

  return {
    tags: tags.data.map((t) => ({
      id: t.id,
      metric: t.metric,
      label: t.label,
      sortOrder: t.sort_order,
      active: t.active,
    })),
    drinks: drinks.data.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      group: d.drink_group,
      countsTowardCoffee: d.counts_toward_coffee,
      sortOrder: d.sort_order,
      active: d.active,
    })),
  };
}

/**
 * Tags and drinks from the database, cached for a day and saved for offline use. `data` is never
 * empty: it starts as the bundled snapshot and is replaced when the real lists arrive.
 */
export function useReferenceData() {
  const query = useQuery({
    queryKey: ["reference-data"],
    queryFn: () =>
      loadReferenceData({ fetchRemote, storage: AsyncStorage, snapshot: referenceDataSnapshot }),
    staleTime: ONE_DAY_MS,
  });
  return { ...query, data: query.data ?? referenceDataSnapshot };
}
