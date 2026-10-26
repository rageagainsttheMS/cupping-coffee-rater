import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Alert, AppState } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import type { OptionalMetric } from "@/domain/metrics";
import { wizardDrinks } from "@/domain/reference";
import { MAX_PHOTOS } from "@/domain/review.schema";
import type { MyReview } from "@/features/profile/types";
import { useMyReviews } from "@/features/profile/useMyReviews";
import { copy } from "@/lib/copy/en";
import type { ReferenceDrink, ReferenceTag } from "@/domain/reference";
import { useReferenceData } from "@/lib/referenceData";
import { clearDraft, loadDraft, saveDraft } from "./draft";
import { editBack, editNext, hasChanges, reviewToValues } from "./edit";
import type { StoredDraft } from "./draft";
import type { ScoreChanges } from "./outcome";
import { ResumePrompt } from "./ResumePrompt";
import { backTarget, nextStep, STEP_ROUTES, stepFromPath } from "./steps";
import { BLANK_DRINK, blankValues } from "./types";
import type { DraftDrink, WizardCafe, WizardPhoto, WizardStep, WizardValues } from "./types";

/** What the Posted screen shows: the cafe, whether it was verified, and how the scores moved. */
export type PostedState = {
  cafe: WizardCafe;
  verified: boolean;
  before: ScoreChanges;
  after: ScoreChanges;
  /** The one follow-up prompt has been used, so it is not offered again. */
  followedUp?: boolean;
};

type WizardContextValue = {
  values: WizardValues;
  drinkIndex: number;
  activeDrink: DraftDrink;
  /** The cafe came from the cafe page, so the cafe step is skipped. */
  cafeLocked: boolean;
  tags: ReferenceTag[];
  drinks: ReferenceDrink[];
  /** Set when a draft was restored: the step to return to. Read once by the first screen. */
  resumeStep: WizardStep | null;
  clearResume: () => void;

  setCafe: (cafe: WizardCafe, locked?: boolean) => void;
  patchDrink: (index: number, patch: Partial<DraftDrink>) => void;
  addDrink: () => void;
  setMetricRating: (metric: OptionalMetric, rating: number | null) => void;
  setCoffeeRating: (rating: number) => void;
  toggleTag: (tagId: number) => void;
  setComment: (comment: string) => void;
  setBeans: (beans: string) => void;
  /** Adds photos after the ones already chosen, up to the cap. */
  addPhotos: (photos: WizardPhoto[]) => void;
  removePhoto: (index: number) => void;

  goTo: (step: WizardStep, drinkIndex?: number) => void;
  goNext: (from: WizardStep) => void;
  goBack: (from: WizardStep) => void;
  close: () => void;
  /** Drops the saved draft. Called when a review is posted. */
  discardDraft: () => Promise<void>;

  posted: PostedState | null;
  setPosted: (update: PostedState | ((previous: PostedState | null) => PostedState | null)) => void;
  /** The wizard is editing a review that is already posted (opened with `editId`). */
  editing: boolean;
  /** The values the edit started from, to tell whether anything changed. */
  editInitial: WizardValues | null;
  /** True while the person is adding to a review that is already posted. */
  editingPosted: boolean;
  setEditingPosted: (editing: boolean) => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const value = useContext(WizardContext);
  if (!value) throw new Error("useWizard must be used inside ReviewWizardProvider");
  return value;
}

type Gate = { state: "loading" } | { state: "ask"; draft: StoredDraft } | { state: "ready" };

/**
 * Holds the review being written for the whole wizard: one form, the saved draft, and moving
 * between steps. On opening it offers to continue a draft less than a day old.
 */
function WizardProvider({ children, edit }: { children: ReactNode; edit: MyReview | null }) {
  const { data: reference } = useReferenceData();
  const form = useForm<WizardValues>({
    defaultValues: edit ? reviewToValues(edit) : blankValues(Crypto.randomUUID()),
  });
  const values = useWatch({ control: form.control }) as WizardValues;

  const [gate, setGate] = useState<Gate>({ state: edit ? "ready" : "loading" });
  const [drinkIndex, setDrinkIndex] = useState(0);
  const [cafeLocked, setCafeLocked] = useState(false);
  const [resumeStep, setResumeStep] = useState<WizardStep | null>(null);
  const [posted, setPosted] = useState<PostedState | null>(null);
  const [editingPosted, setEditingPosted] = useState(false);

  // Editing starts from the loaded review, as a form that is ready at once. Otherwise a new review.
  const editInitial = useMemo(() => (edit ? reviewToValues(edit) : null), [edit]);
  const editing = editInitial !== null;
  const tags = reference.tags;
  const drinks = useMemo(() => wizardDrinks(reference.drinks), [reference.drinks]);

  // Read the draft once, using the tags we already have so retired ones are dropped on restore.
  const tagsRef = useRef(tags);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);
  useEffect(() => {
    if (editing) return;
    let cancelled = false;
    loadDraft(AsyncStorage, tagsRef.current).then((draft) => {
      if (cancelled) return;
      setGate(draft ? { state: "ask", draft } : { state: "ready" });
    });
    return () => {
      cancelled = true;
    };
  }, [editing]);

  // The latest form and position, for saving from event handlers without stale values.
  const pathname = usePathname();
  const step = stepFromPath(pathname);
  const latest = useRef({ values, step, drinkIndex, ready: false });
  useEffect(() => {
    // An edit is never saved as a draft, and must not touch the draft of a review in progress.
    latest.current = { values, step, drinkIndex, ready: gate.state === "ready" && !editing };
  }, [values, step, drinkIndex, gate.state, editing]);

  const persist = useCallback(() => {
    const { values: current, step: at, drinkIndex: index, ready } = latest.current;
    // Nothing worth saving until a cafe is chosen, and nothing to save once it is posted.
    if (!ready || !at || !current.cafe) return;
    void saveDraft(AsyncStorage, { values: current, step: at, drinkIndex: index });
  }, []);

  // Save on every step change, and when the app goes to the background.
  useEffect(() => {
    persist();
  }, [step, persist]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active") persist();
    });
    return () => subscription.remove();
  }, [persist]);

  const update = useCallback(
    (patch: Partial<WizardValues>) => {
      for (const [key, value] of Object.entries(patch)) {
        form.setValue(key as keyof WizardValues, value as never, { shouldDirty: true });
      }
    },
    [form],
  );

  const drinkList = values.drinks ?? [BLANK_DRINK];
  const activeDrink = drinkList[drinkIndex] ?? BLANK_DRINK;

  // Refs the stable actions read, so they never use an old position.
  const drinkIndexRef = useRef(drinkIndex);
  const cafeLockedRef = useRef(cafeLocked);
  const editInitialRef = useRef(editInitial);
  useEffect(() => {
    drinkIndexRef.current = drinkIndex;
    cafeLockedRef.current = cafeLocked;
    editInitialRef.current = editInitial;
  }, [drinkIndex, cafeLocked, editInitial]);

  const actions = useMemo(() => {
    const current = () => form.getValues();

    const patchDrink = (index: number, patch: Partial<DraftDrink>) => {
      const next = current().drinks.map((d, i) => (i === index ? { ...d, ...patch } : d));
      update({ drinks: next });
    };

    const goTo = (target: WizardStep, index?: number) => {
      if (index !== undefined) setDrinkIndex(index);
      router.replace(STEP_ROUTES[target]);
    };

    // Leaving an edit asks first if anything changed.
    const leaveEdit = () => {
      const initial = editInitialRef.current;
      if (!initial || !hasChanges(initial, current())) return router.back();
      Alert.alert(copy.review.edit.discardTitle, copy.review.edit.discardBody, [
        { text: copy.review.edit.keepEditing, style: "cancel" },
        { text: copy.review.edit.discard, style: "destructive", onPress: () => router.back() },
      ]);
    };

    return {
      setCafe: (cafe: WizardCafe, locked = false) => {
        update({ cafe });
        setCafeLocked(locked);
      },
      patchDrink,
      addDrink: () => {
        const drinks = [...current().drinks, { ...BLANK_DRINK }];
        update({ drinks });
        goTo("drink", drinks.length - 1);
      },
      setMetricRating: (metric: OptionalMetric, rating: number | null) => {
        update({ [metric]: rating });
        if (rating === null) {
          // "Didn't try" removes that metric's tags, which the server would reject.
          const ids = new Set(tagsRef.current.filter((t) => t.metric === metric).map((t) => t.id));
          update({ tagIds: current().tagIds.filter((id) => !ids.has(id)) });
        }
      },
      setCoffeeRating: (rating: number) => patchDrink(drinkIndexRef.current, { rating }),
      toggleTag: (tagId: number) => {
        const ids = current().tagIds;
        update({
          tagIds: ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId],
        });
      },
      setComment: (comment: string) => update({ comment }),
      setBeans: (beans: string) => update({ beans }),
      addPhotos: (photos: WizardPhoto[]) =>
        update({ photos: [...current().photos, ...photos].slice(0, MAX_PHOTOS) }),
      removePhoto: (index: number) =>
        update({ photos: current().photos.filter((_, i) => i !== index) }),
      goTo,
      goNext: (from: WizardStep) => {
        if (editInitialRef.current) {
          const next = editNext(from, drinkIndexRef.current, current().drinks.length);
          if (next.to !== "save") goTo(next.to, next.drinkIndex);
          return;
        }
        const to = nextStep(from);
        if (to) goTo(to);
      },
      goBack: (from: WizardStep) => {
        const { drinks: list } = current();
        if (editInitialRef.current) {
          const back = editBack(from, drinkIndexRef.current, list.length);
          if (back.to === "close") leaveEdit();
          else goTo(back.to, back.drinkIndex);
          return;
        }
        const target = backTarget(from, drinkIndexRef.current, list.length, cafeLockedRef.current);
        if (target.to === "close") {
          router.back();
          return;
        }
        // Backing out of an empty extra drink forgets it.
        if (
          from === "drink" &&
          drinkIndexRef.current > 0 &&
          list[drinkIndexRef.current]?.drinkId === null
        ) {
          update({ drinks: list.slice(0, drinkIndexRef.current) });
        }
        goTo(target.to, target.drinkIndex);
      },
      close: () => (editInitialRef.current ? leaveEdit() : router.back()),
    };
  }, [form, update]);

  const discardDraft = useCallback(() => clearDraft(AsyncStorage), []);

  const value: WizardContextValue = {
    values: { ...blankValues(""), ...values, drinks: drinkList },
    drinkIndex,
    activeDrink,
    cafeLocked,
    tags,
    drinks,
    resumeStep,
    clearResume: () => setResumeStep(null),
    ...actions,
    discardDraft,
    posted,
    setPosted,
    editing,
    editInitial,
    editingPosted,
    setEditingPosted,
  };

  if (gate.state === "loading") return null;

  if (gate.state === "ask") {
    const { draft } = gate;
    return (
      <ResumePrompt
        cafeName={draft.values.cafe?.name ?? null}
        onContinue={() => {
          form.reset(draft.values);
          setDrinkIndex(draft.drinkIndex);
          setCafeLocked(false);
          setResumeStep(draft.step);
          setGate({ state: "ready" });
        }}
        onStartAgain={() => {
          void clearDraft(AsyncStorage);
          setGate({ state: "ready" });
        }}
      />
    );
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

/** Opened with `editId` (from My reviews): load that review first, then start the wizard on it. */
function EditLoader({ editId, children }: { editId: string; children: ReactNode }) {
  const myReviews = useMyReviews();
  const review = myReviews.data?.find((r) => r.review_id === editId) ?? null;
  const failed = myReviews.isError || (myReviews.data !== undefined && !review);

  useEffect(() => {
    if (!failed) return;
    Alert.alert(copy.review.edit.loadFailed);
    router.back();
  }, [failed]);

  if (!review) return null;
  return <WizardProvider edit={review}>{children}</WizardProvider>;
}

/**
 * Holds the review being written for the whole wizard. Opened with an `editId` it edits that posted
 * review instead; the id is read once, since later steps are on routes without it.
 */
export function ReviewWizardProvider({ children }: { children: ReactNode }) {
  const params = useGlobalSearchParams<{ editId?: string | string[] }>();
  const [editId] = useState(() =>
    Array.isArray(params.editId) ? params.editId[0] : params.editId,
  );
  if (editId) return <EditLoader editId={editId}>{children}</EditLoader>;
  return <WizardProvider edit={null}>{children}</WizardProvider>;
}
