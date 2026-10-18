import type { ReferenceData } from "@/domain/reference";
import { loadReferenceData } from "../referenceDataLoader";
import type { KeyValueStorage } from "../referenceDataLoader";

const data = (label: string): ReferenceData => ({
  tags: [{ id: 1, metric: "coffee", label, sortOrder: 1, active: true }],
  drinks: [],
});

const snapshot = data("Snapshot");

function memoryStorage(initial?: string): KeyValueStorage & { value: string | undefined } {
  const store = {
    value: initial,
    getItem: async () => store.value ?? null,
    setItem: async (_key: string, value: string) => {
      store.value = value;
    },
  };
  return store;
}

describe("loadReferenceData", () => {
  it("returns the fresh data and saves it for offline use", async () => {
    const storage = memoryStorage();
    const result = await loadReferenceData({
      fetchRemote: async () => data("Fresh"),
      storage,
      snapshot,
    });
    expect(result.tags[0].label).toBe("Fresh");
    expect(JSON.parse(storage.value as string).tags[0].label).toBe("Fresh");
  });

  it("falls back to the last saved copy when the network fails", async () => {
    const storage = memoryStorage(JSON.stringify(data("Saved")));
    const result = await loadReferenceData({
      fetchRemote: async () => {
        throw new Error("offline");
      },
      storage,
      snapshot,
    });
    expect(result.tags[0].label).toBe("Saved");
  });

  it("falls back to the bundled snapshot when nothing is saved", async () => {
    const result = await loadReferenceData({
      fetchRemote: async () => {
        throw new Error("offline");
      },
      storage: memoryStorage(),
      snapshot,
    });
    expect(result).toBe(snapshot);
  });

  it("ignores a corrupt saved copy", async () => {
    const result = await loadReferenceData({
      fetchRemote: async () => {
        throw new Error("offline");
      },
      storage: memoryStorage("{not json"),
      snapshot,
    });
    expect(result).toBe(snapshot);
  });

  it("still returns fresh data when saving it fails", async () => {
    const storage: KeyValueStorage = {
      getItem: async () => null,
      setItem: async () => {
        throw new Error("disk full");
      },
    };
    const result = await loadReferenceData({
      fetchRemote: async () => data("Fresh"),
      storage,
      snapshot,
    });
    expect(result.tags[0].label).toBe("Fresh");
  });
});
