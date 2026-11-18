// SAMPLE CONTENT (D82). Everything in this file is made up so the screens can match the V5 design before the real
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

/** Launch-offer pill in the hero. Display only: the real price is an open client input (D82). */
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

/** Career coach card. Invented person and claims: needs the client's real coach and call terms (D82). */
export const sampleCoach = {
  name: "Gaurav Sharma",
  initials: "GS",
  role: "Career coach",
  chips: ["Free 15-min call", "English or Hindi", "Replies within a day"],
};

/** First guide message and quick replies shown in the hero preview card. Display only: the real chat is on /discover. */
export const sampleChatPreview = {
  greeting:
    "I'll ask a few questions, build your career report and suggest courses that fit you. First, where are you right now?",
  replies: ["In school (15–17)", "In college (18–21)", "Working or job hunting (22–25)"],
};

// ---- Report (V5-Discover report) ----

/**
 * Persona title and tagline on the report hero. Invented: the real title needs `chat` report data and client-approved
 * wording (D82). The report shows this only outside production.
 */
export const sampleReportPersona = {
  title: "The Curious Thinker",
  tagline: "You like working out how things fit together, and you do your best work when you can try ideas out.",
};

/**
 * Strengths and growth areas on the report. Invented scores and wording (D82): the real ones come from combining the
 * interest and personality scores, which `chat` does not do yet. Shown only outside production.
 */
export const sampleReportStrengths = {
  strengths: [
    {
      name: "Problem solving",
      score: 94,
      description: "You enjoy puzzles and break big questions into smaller steps.",
      tip: "Pick one real problem around you and write down three ways to fix it.",
    },
    {
      name: "Creative thinking",
      score: 82,
      description: "You come up with new ideas easily and like to try them.",
      tip: "Keep a note of one idea a day, however small.",
    },
    {
      name: "Learning fast",
      score: 78,
      description: "You pick up new things quickly when they interest you.",
      tip: "Teach what you learned to a friend within a day.",
    },
  ],
  growth: [
    {
      name: "Speaking up in groups",
      description: "You sometimes hold back ideas when the room is busy.",
      tip: "Share one point in every group chat or class this week.",
      course: "Communication & Storytelling at Work",
      href: "/learn",
    },
    {
      name: "Planning your time",
      description: "Good ideas can slip when the week fills up.",
      tip: "Write your top three tasks each morning.",
      course: "Product Management 101",
      href: "/learn",
    },
  ],
};
