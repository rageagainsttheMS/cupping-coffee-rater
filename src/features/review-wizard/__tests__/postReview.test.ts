import * as Location from "expo-location";
import type { ReferenceTag } from "@/domain/reference";
import { supabase } from "@/lib/supabase";
import { PhotoUploadError } from "../errors";
import {
  currentLocation,
  editReview,
  InvalidReviewError,
  postReview,
  updateRatings,
} from "../postReview";
import { blankValues } from "../types";
import type { WizardValues } from "../types";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockUpload = jest.fn();
const mockRemove = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
    storage: { from: jest.fn(() => ({ upload: mockUpload, remove: mockRemove })) },
  },
}));

const rpc = supabase.rpc as unknown as jest.Mock;
const permission = Location.getForegroundPermissionsAsync as jest.Mock;
const position = Location.getCurrentPositionAsync as jest.Mock;

const REVIEW_ID = "3f0c2b8e-5a6d-4a52-9c54-0d6a8e3a1b11";
const CAFE_ID = "7d6b1e26-3c2f-4d75-8a3e-9f1c2b7d4e55";
const cafe = { id: CAFE_ID, name: "Corner Roast", suburb: "Fitzroy", lat: -37.8, lng: 144.97 };
const USER = "9a1d2c3e-4b5f-4a6b-8c7d-0e1f2a3b4c5d";

const tag = (id: number, metric: ReferenceTag["metric"], active = true): ReferenceTag => ({
  id,
  metric,
  label: `Tag ${id}`,
  sortOrder: id,
  active,
});
const TAGS = [
  tag(1, "coffee"),
  tag(2, "food"),
  tag(3, "work"),
  tag(4, "vibe"),
  tag(5, "work", false),
];

const filled = (over: Partial<WizardValues> = {}): WizardValues => ({
  ...blankValues(REVIEW_ID, cafe),
  drinks: [{ drinkId: 9, milk: "oat", rating: 4.5, priceAud: 5 }],
  comment: "Smooth and well made, good table.",
  ...over,
});

const PHOTO = { uri: "file:///photo.jpg", width: 800, height: 600 };
const RESULT = { review_id: REVIEW_ID, verified: true, before: {}, after: {} };

beforeEach(() => {
  jest.resetAllMocks();
  (supabase.storage.from as jest.Mock).mockReturnValue({ upload: mockUpload, remove: mockRemove });
  permission.mockResolvedValue({ granted: false });
  mockUpload.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
  globalThis.fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) });
});

describe("currentLocation", () => {
  it("is null without permission and never asks for a fix", async () => {
    expect(await currentLocation()).toBeNull();
    expect(position).not.toHaveBeenCalled();
  });

  it("returns the position when permission is granted", async () => {
    permission.mockResolvedValue({ granted: true });
    position.mockResolvedValue({ coords: { latitude: -37.8, longitude: 144.97 } });
    expect(await currentLocation()).toEqual({ lat: -37.8, lng: 144.97 });
  });

  it("is null when the lookup throws", async () => {
    permission.mockResolvedValue({ granted: true });
    position.mockRejectedValue(new Error("no fix"));
    expect(await currentLocation()).toBeNull();
  });

  it("gives up after a few seconds without a fix", async () => {
    jest.useFakeTimers();
    try {
      permission.mockResolvedValue({ granted: true });
      position.mockReturnValue(new Promise(() => {}));
      const result = currentLocation();
      await jest.advanceTimersByTimeAsync(4000);
      expect(await result).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("postReview", () => {
  it("posts and returns what the function says", async () => {
    rpc.mockResolvedValue({ data: RESULT, error: null });
    const result = await postReview({ values: filled(), tags: TAGS, userId: USER });
    expect(result).toEqual(RESULT);
    expect(rpc).toHaveBeenCalledWith("submit_review", expect.any(Object));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects an invalid review before calling the server", async () => {
    await expect(
      postReview({ values: blankValues(REVIEW_ID, cafe), tags: TAGS, userId: USER }),
    ).rejects.toBeInstanceOf(InvalidReviewError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uploads the photo to the person's folder before posting", async () => {
    rpc.mockResolvedValue({ data: RESULT, error: null });
    await postReview({ values: filled({ photos: [PHOTO] }), tags: TAGS, userId: USER });
    expect(mockUpload).toHaveBeenCalledWith(`${USER}/${REVIEW_ID}_0.jpg`, expect.any(ArrayBuffer), {
      contentType: "image/jpeg",
      upsert: true,
    });
  });

  it("uploads every photo and its thumbnail, and sends them in order", async () => {
    rpc.mockResolvedValue({ data: RESULT, error: null });
    const photos = [
      { ...PHOTO, thumbUri: "file:///t0.jpg" },
      { uri: "file:///b.jpg", width: 1600, height: 900, thumbUri: "file:///t1.jpg" },
      { uri: "file:///c.jpg", width: 900, height: 1600 },
    ];
    await postReview({ values: filled({ photos }), tags: TAGS, userId: USER });
    const uploaded = mockUpload.mock.calls.map((c) => c[0]).sort();
    expect(uploaded).toEqual(
      [
        `${USER}/${REVIEW_ID}_0.jpg`,
        `${USER}/${REVIEW_ID}_0_t.jpg`,
        `${USER}/${REVIEW_ID}_1.jpg`,
        `${USER}/${REVIEW_ID}_1_t.jpg`,
        `${USER}/${REVIEW_ID}_2.jpg`,
      ].sort(),
    );
    expect(rpc.mock.calls[0][1].p_photos).toEqual([
      {
        path: `${USER}/${REVIEW_ID}_0.jpg`,
        thumb_path: `${USER}/${REVIEW_ID}_0_t.jpg`,
        width: 800,
        height: 600,
      },
      {
        path: `${USER}/${REVIEW_ID}_1.jpg`,
        thumb_path: `${USER}/${REVIEW_ID}_1_t.jpg`,
        width: 1600,
        height: 900,
      },
      { path: `${USER}/${REVIEW_ID}_2.jpg`, thumb_path: null, width: 900, height: 1600 },
    ]);
  });

  it("deletes every file when one upload fails, and does not post", async () => {
    mockUpload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error("bucket full") })
      .mockResolvedValue({ error: null });
    const photos = [PHOTO, { ...PHOTO, uri: "file:///b.jpg" }];
    await expect(
      postReview({ values: filled({ photos }), tags: TAGS, userId: USER }),
    ).rejects.toBeInstanceOf(PhotoUploadError);
    expect(rpc).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith([
      `${USER}/${REVIEW_ID}_0.jpg`,
      `${USER}/${REVIEW_ID}_1.jpg`,
    ]);
  });

  it("rejects more than three photos before uploading", async () => {
    const photos = [PHOTO, PHOTO, PHOTO, PHOTO];
    await expect(
      postReview({ values: filled({ photos }), tags: TAGS, userId: USER }),
    ).rejects.toBeInstanceOf(InvalidReviewError);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("reports a failed upload as a photo problem and does not post", async () => {
    mockUpload.mockResolvedValue({ error: new Error("bucket full") });
    await expect(
      postReview({ values: filled({ photos: [PHOTO] }), tags: TAGS, userId: USER }),
    ).rejects.toBeInstanceOf(PhotoUploadError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("deletes the uploaded photo when the function fails, and rethrows", async () => {
    const failure = { code: "23505", message: "duplicate" };
    rpc.mockResolvedValue({ data: null, error: failure });
    await expect(
      postReview({ values: filled({ photos: [PHOTO] }), tags: TAGS, userId: USER }),
    ).rejects.toBe(failure);
    expect(mockRemove).toHaveBeenCalledWith([`${USER}/${REVIEW_ID}_0.jpg`]);
  });

  it("still rethrows the original error if cleaning up the photo fails", async () => {
    const failure = { code: "XX000", message: "boom" };
    rpc.mockResolvedValue({ data: null, error: failure });
    mockRemove.mockRejectedValue(new Error("offline"));
    await expect(
      postReview({ values: filled({ photos: [PHOTO] }), tags: TAGS, userId: USER }),
    ).rejects.toBe(failure);
  });

  it("leaves the photo and details out for 'Skip and post'", async () => {
    rpc.mockResolvedValue({ data: RESULT, error: null });
    await postReview({
      values: filled({ photos: [PHOTO], beans: "Market Lane" }),
      tags: TAGS,
      userId: USER,
      withoutDetails: true,
    });
    expect(mockUpload).not.toHaveBeenCalled();
    expect(JSON.stringify(rpc.mock.calls[0][1])).not.toContain("Market Lane");
  });
});

describe("updateRatings", () => {
  it("sends only the extras' own active tags for metrics that were rated", async () => {
    rpc.mockResolvedValue({ data: { review_id: REVIEW_ID }, error: null });
    await updateRatings({
      values: filled({ food: 4, work: 3, vibe: null, tagIds: [1, 2, 3, 4, 5] }),
      tags: TAGS,
    });
    expect(rpc).toHaveBeenCalledWith("update_review_ratings", {
      p_review_id: REVIEW_ID,
      p_food: 4,
      p_vibe: undefined,
      p_work: 3,
      p_tags: [2, 3],
    });
  });

  it("throws the database error", async () => {
    const failure = { code: "42501", message: "denied" };
    rpc.mockResolvedValue({ data: null, error: failure });
    await expect(updateRatings({ values: filled({ food: 4 }), tags: TAGS })).rejects.toBe(failure);
  });
});

describe("editReview", () => {
  it("rejects values that don't make a valid edit", async () => {
    await expect(
      editReview({ values: { ...filled(), reviewId: "not-a-uuid" }, tags: TAGS }),
    ).rejects.toBeInstanceOf(InvalidReviewError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves a valid edit through update_review", async () => {
    rpc.mockResolvedValue({ data: { review_id: REVIEW_ID }, error: null });
    await editReview({ values: filled({ tagIds: [1] }), tags: TAGS });
    expect(rpc).toHaveBeenCalledWith("update_review", expect.any(Object));
  });
});
