// PLACEHOLDER. The client supplies the real self-harm and abuse word list together with the helpline wording
// (docs/open-questions.md, "Helpline link and wording, plus the blocked-word list for the name check"). Until then this
// short list stands in so the flow can be built and tested. Data only: swap or extend it without touching logic.
//
// Known limits: no leetspeak (digits and symbols are refused as a bad format anyway). Look-alike letters from other
// scripts are closed by the script allowlist in name-check.ts (Latin, nine Indian scripts and Arabic, one per word).
// Regional-language terms are missing. The check is a safety net for a distressed learner, not a security control.
// Matching is by whole words and phrases, case-insensitive, ignoring accents and punctuation (see name-check.ts), so a
// harmless name that merely contains a term ("Diego" contains "die") is not blocked.

/**
 * Phrases a learner in distress might type instead of a name. A hit shows the helpline stop screen.
 * TEMPORARY Hindi and Hinglish additions (2026-11-03): no open source publishes these, so every Hindi or Hinglish
 * phrase below is OUR OWN transliteration or construction ("own inference") and must be reviewed by a native speaker
 * or a clinician before launch. Hinglish has no fixed spelling and verbs change with gender, so the list is
 * incomplete by nature. Regional languages (Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi, Kannada, Malayalam,
 * Urdu script) are not covered at all. The client supplies the real list with the helpline wording.
 */
export const SELF_HARM_TERMS: readonly string[] = [
  // English
  "suicide",
  "suicidal",
  "kill myself",
  "end my life",
  "want to die",
  "hurt myself",
  "harm myself",
  "self harm",
  "cut myself",
  // Hinglish (Latin letters)
  "aatmahatya",
  "atmahatya",
  "khudkushi",
  "khudkhushi",
  "mujhe marna hai",
  "mujhe mar jana hai",
  "main marna chahta hu",
  "main marna chahti hu",
  "mai marna chahta hoon",
  "mai marna chahti hoon",
  "marna chahta hu",
  "marna chahti hu",
  "mar jana chahta hu",
  "mar jana chahti hu",
  "mujhe jeena nahi hai",
  "mujhe nahi jeena",
  "main jeena nahi chahta",
  "main jeena nahi chahti",
  "jeena nahi chahta",
  "jeena nahi chahti",
  "mai jina nahi chahta",
  "mai jina nahi chahti",
  "mujhe jeena nahi",
  "khud ko khatam kar lunga",
  "khud ko khatam kar lungi",
  "apni jaan de dunga",
  "apni jaan de dungi",
  "apni jaan dena chahta hu",
  "apni zindagi khatam kar lunga",
  "apni zindagi khatam kar lungi",
  "zindagi khatam karna chahta hu",
  "zindagi khatam karna chahti hu",
  "suicide karna hai",
  "suicide kar lunga",
  "suicide kar lungi",
  // Devanagari
  "आत्महत्या",
  "ख़ुदकुशी",
  "मुझे मरना है",
  "मैं मरना चाहता हूँ",
  "मैं मरना चाहती हूँ",
  "मरना चाहता हूँ",
  "मरना चाहती हूँ",
  "मैं मर जाना चाहता हूँ",
  "मैं मर जाना चाहती हूँ",
  "मुझे जीना नहीं है",
  "मैं जीना नहीं चाहता",
  "मैं जीना नहीं चाहती",
  "मैं खुद को खत्म कर लूँगा",
  "मैं खुद को खत्म कर लूँगी",
  "अपनी जान दे दूँगा",
  "अपनी जान दे दूँगी",
  "आत्महत्या करना चाहता हूँ",
  "आत्महत्या करना चाहती हूँ",
];

/**
 * Abusive words. A hit asks the learner to enter a real name; no helpline, the attempt stays open.
 * The Hinglish (Latin letters) terms come from the LDNOOBW list of bad words (Hindi file),
 * https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, licence CC BY 4.0: credit it where
 * the licence requires (docs/open-questions.md). The Devanagari forms are our own transliterations ("own inference").
 * Left out on purpose: words that are also real names or community names (for example lund, randi, kanjar, hijra,
 * bhangi), and mild or ordinary words. Needs native-speaker review before launch.
 */
export const ABUSE_TERMS: readonly string[] = [
  // English
  "idiot",
  "stupid",
  "bastard",
  "bitch",
  "asshole",
  "fuck",
  "shit",
  // Hinglish (Latin letters), LDNOOBW
  "madarchod",
  "madar chod",
  "madhavchod",
  "behen chod",
  "behenchod",
  "beti chod",
  "chutiya",
  "chutia",
  "chootiya",
  "chootia",
  "chut",
  "choot",
  "chodu",
  "gaand",
  "gaandu",
  "gandu",
  "gandfattu",
  "bhosad",
  "bhadva",
  "bhadve",
  "lauda",
  "lodu",
  "randaap",
  "harami",
  "haramzade",
  "kuttiya",
  "jhant",
  "jhantu",
  "chinaal",
  // Devanagari (own transliterations)
  "मादरचोद",
  "बहनचोद",
  "भेनचोद",
  "चूतिया",
  "चुतिया",
  "गांडू",
  "गाँडू",
  "भोसड़ी",
  "रंडी",
  "हरामी",
  "हरामज़ादा",
  "लंड",
  "झांटू",
  "छिनाल",
  "भड़वा",
];

/**
 * The two lists have different outcomes (decided 2026-11-03): a self-harm hit shows the helpline stop screen and ends
 * the attempt; an abuse hit only asks for a real name again (a real name can collide with an abuse word, so the
 * learner is not locked out or sent to a helpline).
 */
export type NameBlocklists = { selfHarm: readonly string[]; abuse: readonly string[] };

export const NAME_BLOCKLISTS: NameBlocklists = { selfHarm: SELF_HARM_TERMS, abuse: ABUSE_TERMS };
