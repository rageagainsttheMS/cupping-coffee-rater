import type { ReferenceData } from "@/domain/reference";

const STORAGE_KEY = "reference-data:v1";

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
};

type Deps = {
  fetchRemote: () => Promise<ReferenceData>;
  storage: KeyValueStorage;
  /** Last resort for a first launch with no network. */
  snapshot: ReferenceData;
};

function parseStored(raw: string | null): ReferenceData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReferenceData>;
    return Array.isArray(parsed.tags) && Array.isArray(parsed.drinks)
      ? (parsed as ReferenceData)
      : null;
  } catch {
    return null;
  }
}

/**
 * Fresh from the database when possible, and saved for offline use. If the network fails, use the
 * last saved copy, then the bundled snapshot, so the lists are never empty.
 */
export async function loadReferenceData({
  fetchRemote,
  storage,
  snapshot,
}: Deps): Promise<ReferenceData> {
  try {
    const fresh = await fetchRemote();
    await Promise.resolve(storage.setItem(STORAGE_KEY, JSON.stringify(fresh))).catch(() => {});
    return fresh;
  } catch {
    const stored = await storage.getItem(STORAGE_KEY).catch(() => null);
    return parseStored(stored) ?? snapshot;
  }
}
