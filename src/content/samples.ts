// SAMPLE CONTENT (D92). Everything in this file is made up so the screens can match the V5 design before the real
// content exists. Each item is replaced or removed before launch (E14-S5); search for `samples` to find every use.
// Never put real personal data here.

/** Offer bar above the header. Display only: there is no real coupon, and checkout prices always come from the server. */
export const sampleOffer: { text: string; highlight: string; code: string; ends: string } | null = {
  text: "New Year offer:",
  highlight: "25% off every course",
  code: "NEWYEAR26",
  ends: "ends 15 Jan",
};

// ---- Home page (V5-Home) ----

/** Launch-offer pill in the hero. Display only: the real price is an open client input (D92). */
export const sampleLaunchOffer = { label: "Launch offer", before: "₹999", free: "FREE", after: "for a limited time" };

export type SampleStory = {
  name: string;
  initials: string;
  role: string;
  before: string;
  after: string;
  quote: string;
  /** Colour family for the card (mapped to tokens in the component). */
  tone: "brand" | "sun" | "success" | "teal";
};

/** Student stories carousel. Invented people and quotes: replace with real, approved stories before launch. */
export const sampleStories: SampleStory[] = [
  {
    name: "Aarav S.",
    initials: "AS",
    role: "Class 12",
    before: "Unsure about streams",
    after: "Chose Commerce",
    quote:
      "I had no idea which stream suited me. The report gave me words for what I enjoy, and my parents finally listened.",
    tone: "brand",
  },
  {
    name: "Diya M.",
    initials: "DM",
    role: "First-year college",
    before: "Dreaded group discussions",
    after: "Led her first GD",
    quote: "The lessons were short and practical. Last month I opened a discussion in class without my hands shaking.",
    tone: "sun",
  },
  {
    name: "Kabir R.",
    initials: "KR",
    role: "Final-year student",
    before: "Blank LinkedIn profile",
    after: "Got two recruiter messages",
    quote:
      "I copied nothing, I just followed the steps. A recruiter wrote to me within two weeks of updating my profile.",
    tone: "success",
  },
  {
    name: "Meher K.",
    initials: "MK",
    role: "Job seeker",
    before: "Froze in interviews",
    after: "Cleared a second round",
    quote: "Practising the answers out loud made the real interview feel familiar. I stopped rushing my words.",
    tone: "teal",
  },
  {
    name: "Rohan P.",
    initials: "RP",
    role: "Class 11",
    before: "Never led anything",
    after: "Runs the science club",
    quote: "I thought leaders were born that way. The course showed me small habits I could start on day one.",
    tone: "brand",
  },
];

/** Career coach card. Invented person and claims: needs the client's real coach and call terms (D92). */
export const sampleCoach = {
  name: "Gaurav Sharma",
  initials: "GS",
  role: "Career coach",
  chips: ["Free 15-min call", "English or Hindi", "Replies within a day"],
};

/**
 * Intro line of the guide in the hero preview card. The question and quick replies after it come from the question set
 * (`getHomeQuestion`, D87); only this sentence is page copy.
 */
export const sampleChatPreview = {
  intro: "I'll ask a few questions, build your career report and suggest courses that fit you.",
};
