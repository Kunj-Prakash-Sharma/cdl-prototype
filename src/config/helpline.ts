// The distress helpline shown on every chat screen and on the stop screen (decision D70). DATA ONLY.
// DUMMY values until the client supplies the real helpline wording, number and link (docs/open-questions.md).
// While `placeholder` is true the UI marks it visibly, so nobody ships it by accident.
export const helpline = {
  placeholder: true,
  prompt: "Feeling low or need someone to talk to?",
  name: "Helpline",
  phone: "0000000000",
  phoneDisplay: "00000 00000",
  url: "https://example.com/helpline",
  note: "Free and private. You are not alone.",
} as const;
