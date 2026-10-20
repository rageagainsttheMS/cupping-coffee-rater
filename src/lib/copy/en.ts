import type { DrinkGroup, Milk } from "@/domain/drinks";
import type { Metric } from "@/domain/metrics";

/**
 * Every piece of user-facing text in the app, in one place. Components import `copy` and never
 * contain readable string literals (ESLint enforces this in `src/app` and `src/components`).
 *
 * Text that depends on a value is a function so the wording stays here and stays typed.
 * Drink names and tag labels are not here: they come from the database.
 */
export const copy = {
  common: {
    appName: "Cupping - Coffee Rater",
    close: "Close",
    back: "Back",
    skip: "Skip",
    next: "Next",
    loading: "Loading",
  },

  tabs: {
    map: "Map",
    saved: "Saved",
    rate: "Rate",
    profile: "Profile",
  },

  screens: {
    map: "Near you",
    saved: "Saved",
    profile: "Profile",
    review: "Rate a cafe",
  },

  /** Stand-in screens, until the real ones are built. */
  placeholder: {
    builtIn: (milestone: string) => `Placeholder, built in ${milestone}.`,
  },

  metrics: {
    coffee: { label: "Coffee", prompt: "How was your coffee?" },
    food: { label: "Food", prompt: "How was the food?" },
    vibe: { label: "Vibe", prompt: "How did it feel?" },
    work: { label: "Work", prompt: "Could you work here?" },
  } satisfies Record<Metric, { label: string; prompt: string }>,

  review: {
    coffeePrompt: (drinkName: string) => `How was your ${drinkName.toLowerCase()}?`,
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    progress: (step: number, total: number) => `Review progress, step ${step} of ${total}`,
    continue: "Continue",
    edit: {
      saveChanges: "Save changes",
      discardTitle: "Discard your changes?",
      discardBody: "Your edits to this review won't be saved.",
      keepEditing: "Keep editing",
      discard: "Discard",
      loadFailed: "Couldn't open this review. Try again.",
      saveFailed: "Couldn't save your changes. Try again.",
      networkFailed: "Couldn't save your changes. Check your connection and try again.",
    },
    resume: {
      title: (cafe: string) => `Continue your review of ${cafe}?`,
      titleNoCafe: "Continue your review?",
      body: "You started a review in the last day.",
      continue: "Continue",
      startAgain: "Start again",
    },
    cafe: {
      title: "Which cafe?",
      hereNow: (distance: string) => `You're here · ${distance}`,
      nearest: (distance: string) => `Nearest · ${distance}`,
      nearby: "Nearby",
      searchOther: "Search for a different cafe",
      needsLocation:
        "Search for the cafe you're at. Allow location to see cafes near you and to get a verified-visit badge.",
      findingNearby: "Finding cafes near you",
      noNearby: "No cafes found near you. Try searching.",
      loadingCafe: "Loading the cafe",
      loadError: "We couldn't load that cafe.",
      selected: "Selected",
    },
    drink: {
      title: "What did you have?",
      another: (n: number) => `Drink ${n}`,
      more: "More…",
      fewer: "Fewer",
      milkOptional: "Milk · Optional",
      alreadyAdded: "Already added",
    },
    rate: {
      pill: (drink: string, milk: string | null, cafe: string) =>
        [drink, milk, cafe].filter(Boolean).join(" · "),
      hint: "Tap or drag the stars",
      tags: "What stood out?",
      another: "+ Another drink",
    },
    extras: {
      title: "How about the rest?",
      body: "Rate what you tried. Skip anything you didn't.",
      didntTry: "Didn't try",
      tapToRate: "Tap to rate",
      tags: "What stood out?",
      followUpTitle: "Add more details",
      save: "Save",
    },
    comment: {
      title: "Say a few words",
      placeholder: (drink: string, workRated: boolean) =>
        workRated
          ? `How was the ${drink.toLowerCase()}? Strength, milk, temperature… and how was it to work from?`
          : `How was the ${drink.toLowerCase()}? Strength, milk, temperature…`,
      counter: (length: number, max: number) => `${length}/${max}`,
      tooShort: (min: number) => `Write at least ${min} characters.`,
    },
    details: {
      title: "Add details",
      body: "All optional. They help the next person.",
      price: "Price",
      priceOthers: (price: string) => `Others paid about ${price}`,
      priceNotSet: "Not set",
      priceUp: "More",
      priceDown: "Less",
      beans: "Beans",
      beansPlaceholder: "Roaster or blend",
      beansOthers: (name: string, count: number) => `Others said: ${name} · ${count}`,
      photo: "Photo",
      takePhoto: "Take a photo",
      choosePhoto: "Choose from library",
      removePhoto: "Remove photo",
      photoPreview: "Your photo",
      cameraDenied: "Camera access is off. You can turn it on in your phone's settings.",
      photoFailed: "We couldn't use that photo. Try another.",
      post: "Post review",
      skipAndPost: "Skip and post",
    },
    errors: {
      duplicateToday: (cafe: string) => `You've already rated ${cafe} today`,
      duplicateTodayBody: "You can review it again tomorrow.",
      rateLimit: "You've posted a lot of reviews today",
      rateLimitBody: "Please try again tomorrow.",
      network: "Can't reach the server",
      networkBody: "Your review is saved. Check your connection and try again.",
      photo: "We couldn't upload your photo",
      photoBody: "Try again, or remove the photo and post without it.",
      generic: "We couldn't post your review",
      genericBody: "Your review is saved. Please try again.",
      invalid: "Something in your review needs another look.",
      retry: "Try again",
      dismiss: "OK",
    },
    posted: {
      title: "Thanks, your review is live",
      verified: "Verified visit badge added",
      unlocked: (label: string, to: string) => `${label}: New → ${to} · your rating unlocked it`,
      moved: (label: string, from: string, to: string) => `${label}: ${from} → ${to}`,
      unchanged: (label: string, score: string) => `${label}: ${score}`,
      pending: (label: string, remaining: number) =>
        `${label}: New · ${remaining} more ${remaining === 1 ? "rating" : "ratings"} to unlock`,
      followUp: (label: string) => `Add ${label.toLowerCase()} details?`,
      followUpBody: "It takes a few seconds and makes the scores more useful.",
      followUpAction: "Add now",
      saved: "Saved",
      saveFailed: "We couldn't save that. Try again.",
      seeCafe: (name: string) => `See ${name}`,
      backToMap: "Back to the map",
    },
  },

  score: {
    /** Shown instead of a score until a metric has enough ratings. */
    new: "New",
    /** A rating not yet chosen, in the big readout. */
    empty: "–",
  },

  drinkGroups: {
    espresso: "Espresso",
    brewed: "Brewed",
    iced: "Iced",
    other: "Other",
  } satisfies Record<DrinkGroup, string>,

  milks: {
    full_cream: "Full cream",
    skim: "Skim",
    oat: "Oat",
    soy: "Soy",
    almond: "Almond",
    lactose_free: "Lactose free",
  } satisfies Record<Milk, string>,

  onboarding: {
    welcome: {
      title: "Find the best cafes, rated by other coffee addicts",
      body: "Rate coffee, food, vibe and work-friendliness at cafes near you, drink by drink.",
      getStarted: "Get started",
      haveAccount: "I already have an account",
      /** Example pins for the welcome picture. Not real data. */
      samplePins: {
        coffee: "Coffee 4.6",
        work: "Work 4.8",
        vibe: "Vibe 4.4",
        food: "Food 4.1",
      },
    },
    scores: {
      title: "Four scores, not one.",
      body: "Every cafe is rated on what matters to you.",
      coffee: "The most important part",
      food: "Brunch, pastries, anything you ate",
      vibe: "Atmosphere, service and noise",
      work: "Wifi, power and a seat to study",
    },
    drink: {
      title: "Rate the drink, not just the cafe.",
      body: "Tell us what you had and we'll show you the best flat white, long black or magic nearby.",
      cardTitle: "What to order",
      cardCafe: "Corner Roast",
      footnote: "Add the price and beans if you like, so the next person knows what to expect.",
      createAccount: "Create your account",
    },
    /** A made-up cafe, to show what the cafe page will look like. */
    sampleDrinks: [
      { name: "Magic", detail: "14 people · about $5.80", score: "4.8" },
      { name: "Flat white", detail: "19 people · about $5.50", score: "4.6" },
      { name: "Long black", detail: "8 people · about $4.80", score: "4.2" },
    ],
    pageDots: (page: number, total: number) => `Page ${page} of ${total}`,
  },

  location: {
    title: "Find cafes near you.",
    body: "Allow location to see ratings around you and to mark your reviews as verified visits.",
    allow: "Allow location",
    notNow: "Not now",
    changeLater: "You can change this any time in settings.",
  },

  auth: {
    signIn: {
      title: "Welcome back to Cupping - Coffee Rater",
      subtitle: "Sign in to find the best cup, rate what you drink and save your favourites.",
      google: "Continue with Google",
      apple: "Continue with Apple",
      orEmail: "or with email",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "Your password",
      forgot: "Forgot password?",
      submit: "Sign in",
      newHere: "New here?",
      createLink: "Create an account",
    },
    signUp: {
      title: "Join the cafe regulars",
      subtitle: "Rate the drinks you have and help people find the best cafes",
      google: "Google",
      apple: "Apple",
      orEmail: "or with email",
      displayName: "Display name",
      displayNamePlaceholder: "Shown on your reviews",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "At least 8 characters",
      agreePrefix: "I agree to the ",
      terms: "Terms of Use",
      and: " and ",
      privacy: "Privacy Policy",
      submit: "Create account",
      haveAccount: "Already have an account?",
      signInLink: "Sign in",
      checkEmailTitle: "Check your email",
      checkEmailBody: (email: string) =>
        `We sent a link to ${email}. Open it on this phone to finish creating your account.`,
      backToSignIn: "Back to sign in",
    },
    forgot: {
      title: "Reset your password",
      body: "Enter your email and we'll send you a link to choose a new password.",
      submit: "Send link",
      sentTitle: "Check your email",
      sentBody: (email: string) =>
        `If there's an account for ${email}, a reset link is on its way. Open it on this phone.`,
      backToSignIn: "Back to sign in",
    },
    reset: {
      title: "Choose a new password",
      password: "New password",
      passwordPlaceholder: "At least 8 characters",
      confirm: "Confirm password",
      confirmPlaceholder: "Type it again",
      submit: "Save password",
    },
    terms: {
      title: "One more thing",
      body: "Please agree to our terms and privacy policy to keep going.",
      submit: "Continue",
      signOut: "Not now, sign out",
    },
    profileError: {
      title: "We couldn't load your account",
      body: "Check your connection and try again.",
      retry: "Try again",
      signOut: "Sign out",
    },
    checkbox: {
      checked: "Checked",
      unchecked: "Not checked",
    },
    errors: {
      emailInvalid: "Enter a valid email address.",
      passwordTooShort: "Use at least 8 characters.",
      passwordRequired: "Enter your password.",
      passwordsDifferent: "The passwords don't match.",
      nameRequired: "Enter a name to show on your reviews.",
      nameTooLong: "Keep your name to 40 characters.",
      termsRequired: "Agree to the terms to continue.",
      invalidCredentials: "That email and password don't match.",
      emailTaken: "There's already an account with that email. Try signing in.",
      emailNotConfirmed: "Confirm your email first. Check your inbox for the link.",
      weakPassword: "That password is too easy to guess. Try a longer one.",
      rateLimited: "Too many tries. Wait a few minutes and try again.",
      network: "Can't reach the server. Check your connection and try again.",
      playServices:
        "Google sign-in needs Google Play services, which this phone doesn't have or needs to update.",
      linkInvalid: "That link has expired or was already used. Request a new one.",
      generic: "Something went wrong. Please try again.",
    },
  },

  map: {
    distanceMetres: (metres: number) => `${metres} m`,
    distanceKm: (km: string) => `${km} km`,
    bestHere: (drink: string, score: string) => `Best here: ${drink} ${score}`,
    rateFirst: "Rate first",
    newPin: "New",
    search: "Search cafes",
    recentre: "Show my location",
    noCafes: "No cafes here yet",
    noCafesBody: "Move the map or search for a cafe.",
    findingCafes: "Looking for cafes nearby",
    pinRated: (name: string, metricLabel: string, score: string) =>
      `${name}, ${metricLabel} ${score}`,
    pinNew: (name: string, metricLabel: string) => `${name}, ${metricLabel} not rated enough yet`,
    pinRateFirst: (name: string) => `${name}, no ratings yet. Be the first to rate it`,
    cluster: (count: number, best: string | null) =>
      best === null ? `${count} cafes` : `${count} cafes, best score ${best}`,
    cardLabel: (name: string) => `${name}. Open cafe page`,
    suburbAndDistance: (suburb: string, distance: string) =>
      distance ? `${suburb} · ${distance}` : suburb,
  },

  saved: {
    rowLabel: (name: string) => `${name}. Open cafe page`,
    lastRating: (drink: string, rating: string) => `Your last rating: ${drink} ${rating}`,
    removed: (name: string) => `Removed ${name}`,
    undo: "Undo",
    emptyTitle: "No saved cafes yet",
    emptyBody: "Tap the heart on a cafe to keep it here.",
    emptyAction: "Find cafes on the map",
    loadError: "Couldn't load your saved cafes.",
    retry: "Try again",
  },

  profile: {
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    nameLabel: "Display name",
    nameSaveFailed: "Couldn't save your name. Try again.",
    stats: { reviews: "Reviews", cafes: "Cafes", saved: "Saved" },
    activity: "Activity",
    settings: "Settings",
    myReviewsRow: "My reviews",
    savedCafesRow: "Saved cafes",
    location: "Location",
    locationStatus: {
      "while-using": "While using",
      denied: "Not allowed",
      "not-asked": "Not set",
    },
    appearance: "Appearance",
    appearanceOptions: { system: "System", light: "Light", dark: "Dark" },
    appearanceScreen: {
      hints: {
        system: "Match your phone's setting",
        light: "Always use the light theme",
        dark: "Always use the dark theme",
      },
    },
    account: "Account and password",
    help: "Help and feedback",
    signOut: "Sign out",
    rowLabel: (label: string, value: string) => (value ? `${label}, ${value}` : label),
    myReviews: {
      title: "My reviews",
      edit: "Edit review",
      edited: "Edited",
      summary: (reviews: number, cafes: number) =>
        `${reviews} ${reviews === 1 ? "review" : "reviews"} across ${cafes} ${cafes === 1 ? "cafe" : "cafes"}`,
      chips: {
        newest: "Newest",
        highest: "Highest rated",
        cafe: "By cafe",
        photo: "Has photo",
      },
      chipsLabel: "Sort and filter your reviews",
      menu: (cafe: string) => `More options for your review of ${cafe}`,
      openCafe: (cafe: string) => `${cafe}. Open cafe page`,
      notRated: "Not rated",
      emptyTitle: "No reviews yet",
      emptyBody: "Rate a cafe and your review will show up here.",
      emptyAction: "Rate a cafe",
      noPhotos: "None of your reviews have a photo.",
      loadError: "Couldn't load your reviews.",
      retry: "Try again",
      delete: "Delete review",
      deleteTitle: "Delete this review?",
      deleteBody: (cafe: string) =>
        `It will be removed from ${cafe} and its scores will update. This can't be undone.`,
      deleteFailed: "Couldn't delete the review. Try again.",
      ago: {
        today: "today",
        yesterday: "yesterday",
        days: (n: number) => `${n} days ago`,
        lastWeek: "last week",
        weeks: (n: number) => `${n} weeks ago`,
        lastMonth: "last month",
        months: (n: number) => `${n} months ago`,
        lastYear: "last year",
        years: (n: number) => `${n} years ago`,
      },
    },
    accountScreen: {
      title: "Account and password",
      email: "Email",
      changePassword: "Change password",
      changePasswordBody: "We'll email you a link to choose a new password.",
      sendLink: "Email me a link",
      sent: (email: string) => `Check ${email} for a link to choose a new password.`,
      failed: "Couldn't send the email. Try again.",
    },
    helpScreen: {
      title: "Help and feedback",
      contact: "Contact us",
      terms: "Terms of Use",
      privacy: "Privacy Policy",
      googleTitle: "Google attribution",
      googleBody:
        "Cafe names, locations, opening hours and Google ratings come from Google Maps Platform. Ratings and scores labelled Coffee, Food, Vibe and Work come from people using this app.",
      version: (version: string) => `Version ${version}`,
    },
  },

  search: {
    title: "Search",
    placeholder: "Search cafes or suburbs",
    googleRow: (query: string) => `Search Google for “${query}”`,
    googleSearching: "Searching Google",
    noResults: "No cafes found",
    noResultsBody: "Try another name, or search Google to add it.",
    error: "Couldn't search right now. Try again.",
    hint: "Type at least 2 letters.",
  },

  cafe: {
    back: "Back",
    save: "Save cafe",
    unsave: "Remove from saved",
    saveFailed: "Couldn't update your saved cafes. Try again.",
    photoPlaceholder: "No photos yet",
    photoLabel: (n: number, total: number) => `Photo ${n} of ${total}. Open full screen`,
    closePhoto: "Close photo",
    openNow: "Open now",
    openTill: (time: string) => `Open till ${time}`,
    closed: "Closed",
    google: "Google",
    googleRating: (rating: string) => `Google rating ${rating}`,
    reviewCount: (label: string, count: number) =>
      `${label} · ${count} ${count === 1 ? "review" : "reviews"}`,
    noTags: "No tags yet",
    showAll: "Show all",
    showFewer: "Show fewer",
    order: {
      title: "What to order",
      people: (count: number) => `${count} ${count === 1 ? "person" : "people"}`,
      price: (price: string) => `about ${price}`,
    },
    beans: {
      line: (name: string, count: number) =>
        `Beans: ${name}, reported by ${count} ${count === 1 ? "person" : "people"}`,
    },
    reviews: {
      title: "Reviews",
      forMetric: (label: string) => `Reviews · ${label}`,
      verified: "Verified visit",
      edited: "Edited",
      empty: (metricLabel: string) => `No ${metricLabel} reviews yet`,
      emptyBody: "Be the first to rate it.",
      loadError: "Couldn't load reviews.",
      retry: "Try again",
      by: (name: string, date: string) => `${name} · ${date}`,
      ratingLabel: (label: string, rating: string) => `${label} ${rating}`,
    },
    directions: "Directions",
    rate: "Rate this cafe",
    notFound: "We couldn't find that cafe",
    loadError: "We couldn't load this cafe",
    loadErrorBody: "Check your connection and try again.",
    retry: "Try again",
  },

  a11y: {
    starsNotRated: "Not rated",
    starsValue: (value: string) => `${value} stars`,
    scoreGoogle: (metricLabel: string, rating: string) =>
      `${metricLabel}, no community score yet. Google rating ${rating}`,
    rateCafe: "Rate a cafe",
    scoreNew: (metricLabel: string) => `${metricLabel}, new`,
    scoreRated: (metricLabel: string, score: number, count: number) =>
      `${metricLabel} ${score.toFixed(1)} from ${count} ratings`,
  },
} as const;
