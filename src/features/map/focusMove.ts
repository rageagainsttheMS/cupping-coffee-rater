/** How long after the map regains focus to try the move again, once the screen change has settled. */
export const FOCUS_RETRY_MS = 600;

/**
 * Moves the map to a cafe picked on the search screen. It tries straight away and again shortly
 * after: while the search screen is closing, the native map view may not be attached yet, and a move
 * asked for then is dropped without an error. Returns a function that cancels the second try.
 */
export function moveWhenReady(move: () => void, retryMs: number = FOCUS_RETRY_MS): () => void {
  move();
  const timer = setTimeout(move, retryMs);
  return () => clearTimeout(timer);
}
