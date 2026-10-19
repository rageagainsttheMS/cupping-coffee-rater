import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { router, usePathname } from "expo-router";
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
import { AppState } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import type { OptionalMetric } from "@/domain/metrics";
import { wizardDrinks } from "@/domain/reference";
import type { ReferenceDrink, ReferenceTag } from "@/domain/reference";
import { useReferenceData } from "@/lib/referenceData";
import { clearDraft, loadDraft, saveDraft } from "./draft";
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
  setPhoto: (photo: WizardPhoto | null) => void;

  goTo: (step: WizardStep, drinkIndex?: number) => void;
  goNext: (from: WizardStep) => void;
  goBack: (from: WizardStep) => void;
  close: () => void;
  /** Drops the saved draft. Called when a review is posted. */
  discardDraft: () => Promise<void>;

  posted: PostedState | null;
  setPosted: (update: PostedState | ((previous: PostedState | null) => PostedState | null)) => void;
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
export function ReviewWizardProvider({ children }: { children: ReactNode }) {
  const { data: reference } = useReferenceData();
  const form = useForm<WizardValues>({ defaultValues: blankValues(Crypto.randomUUID()) });
  const values = useWatch({ control: form.control }) as WizardValues;

  const [gate, setGate] = useState<Gate>({ state: "loading" });
  const [drinkIndex, setDrinkIndex] = useState(0);
  const [cafeLocked, setCafeLocked] = useState(false);
  const [resumeStep, setResumeStep] = useState<WizardStep | null>(null);
  const [posted, setPosted] = useState<PostedState | null>(null);
  const [editingPosted, setEditingPosted] = useState(false);

  const tags = reference.tags;
  const drinks = useMemo(() => wizardDrinks(reference.drinks), [reference.drinks]);

  // Read the draft once, using the tags we already have so retired ones are dropped on restore.
  const tagsRef = useRef(tags);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);
  useEffect(() => {
    let cancelled = false;
    loadDraft(AsyncStorage, tagsRef.current).then((draft) => {
      if (cancelled) return;
      setGate(draft ? { state: "ask", draft } : { state: "ready" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The latest form and position, for saving from event handlers without stale values.
  const pathname = usePathname();
  const step = stepFromPath(pathname);
  const latest = useRef({ values, step, drinkIndex, ready: false });
  useEffect(() => {
    latest.current = { values, step, drinkIndex, ready: gate.state === "ready" };
  }, [values, step, drinkIndex, gate.state]);

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
  useEffect(() => {
    drinkIndexRef.current = drinkIndex;
    cafeLockedRef.current = cafeLocked;
  }, [drinkIndex, cafeLocked]);

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
      setPhoto: (photo: WizardPhoto | null) => update({ photo }),
      goTo,
      goNext: (from: WizardStep) => {
        const to = nextStep(from);
        if (to) goTo(to);
      },
      goBack: (from: WizardStep) => {
        const { drinks: list } = current();
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
      close: () => router.back(),
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
