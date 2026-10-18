/**
 * Display order and enum values only. The drink list, each drink's group and whether it counts
 * towards Coffee live in the `drinks` table. Labels live in the copy file.
 */
export const DRINK_GROUPS = ["espresso", "brewed", "iced", "other"] as const;
export type DrinkGroup = (typeof DRINK_GROUPS)[number];

/** Matches the `milk_type` Postgres enum. Adding a value is a migration. */
export const MILKS = ["full_cream", "skim", "oat", "soy", "almond", "lactose_free"] as const;
export type Milk = (typeof MILKS)[number];
