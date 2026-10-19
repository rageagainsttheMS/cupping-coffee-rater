export const PRICE_STEP = 0.1;
export const PRICE_MAX = 999.99;
/** Where the stepper starts when nobody has reported a price for this drink. */
export const DEFAULT_PRICE = 5;

/** One $0.10 step up or down, in whole cents. Starts from the suggested median, else $5.00. */
export function stepPrice(
  current: number | null,
  suggested: number | null,
  direction: 1 | -1,
): number {
  const base = current ?? suggested ?? DEFAULT_PRICE;
  const cents = Math.round(base * 100) + direction * Math.round(PRICE_STEP * 100);
  return Math.min(PRICE_MAX, Math.max(0, cents / 100));
}
