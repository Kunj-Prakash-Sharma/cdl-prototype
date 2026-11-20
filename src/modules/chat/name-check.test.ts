import { describe, expect, it } from "vitest";
import { ABUSE_TERMS, NAME_BLOCKLISTS, SELF_HARM_TERMS } from "./name-blocklist";
import { MAX_NAME_LENGTH, validateName } from "./name-check";

const ok = (value: string) => ({ ok: true, value });
const format = { ok: false, reason: "format" };
const blocked = { ok: false, reason: "blocked" };
const abusive = { ok: false, reason: "abusive" };
const lists = (selfHarm: string[], abuse: string[] = []) => ({ selfHarm, abuse });

describe("validateName: good names", () => {
  it.each([
    ["Asha", "Asha"],
    ["Asha Rao", "Asha Rao"],
    ["O'Brien", "O'Brien"],
    ["D’Souza", "D’Souza"], // curly apostrophe
    ["Anne-Marie", "Anne-Marie"],
    ["José", "José"],
    ["Zoë", "Zoë"],
    ["Björk", "Björk"],
    ["आर्यन", "आर्यन"], // Devanagari: letters plus vowel signs
    ["தமிழ்", "தமிழ்"],
    ["আয়েশা", "আয়েশা"], // Bengali
    ["ਸਿਮਰਨ", "ਸਿਮਰਨ"], // Gurmukhi
    ["عائشہ", "عائشہ"], // Urdu (Arabic script)
    ["आशा Verma", "आशा Verma"], // a Hindi first name with an English surname: different words, one script each
    ["ＡＳＨＡ", "ASHA"], // fullwidth letters are saved as plain letters (NFKC)
    ["A", "A"],
  ])("accepts %j", (input, value) => {
    expect(validateName(input)).toEqual(ok(value));
  });

  it("trims and collapses spaces", () => {
    expect(validateName("  Asha   Rao  ")).toEqual(ok("Asha Rao"));
    expect(validateName("\tAsha\n Rao ")).toEqual(ok("Asha Rao"));
  });

  it("composes accents (NFC) so the stored name is canonical", () => {
    expect(validateName("José")).toEqual(ok("José"));
  });

  it("allows exactly 30 characters, not 31", () => {
    expect(validateName("a".repeat(MAX_NAME_LENGTH))).toEqual(ok("a".repeat(30)));
    expect(validateName("a".repeat(MAX_NAME_LENGTH + 1))).toEqual(format);
  });

  it("counts length the way auth does (JS string length), so chat is never looser than auth", () => {
    // "क्ष" is one letter but 3 UTF-16 units (क + virama + ष), so 10 of them are exactly 30 units
    expect(validateName("क्ष".repeat(10)).ok).toBe(true);
    expect(validateName("क्ष".repeat(11))).toEqual(format); // 33 units: auth would refuse it
  });
});

describe("validateName: bad format", () => {
  it.each([
    "",
    "   ",
    "\n",
    "a1",
    "123",
    "Asha!",
    "Asha_Rao",
    "Asha@home",
    "Asha.",
    "-Asha",
    "'Asha",
    " - ",
    "😀",
    "Asha 😀",
    "Asha\u0000",
    "Asha​rao", // zero-width space
    "<b>Asha</b>",
    "Asha; drop table",
  ])("rejects %j as a format problem", (input) => {
    expect(validateName(input)).toEqual(format);
  });

  it.each([
    "李雷", // Chinese: not an allowed script
    "Иван", // Cyrillic
    "Αλέξης", // Greek
    "אברהם", // Hebrew
    "ᚠᚢᚦ", // runes
  ])("rejects %j: not Latin, an Indian script or Arabic", (input) => {
    expect(validateName(input)).toEqual(format);
  });

  it.each([
    ["ѕuicide", "Cyrillic ѕ inside Latin letters"],
    ["аsha", "Cyrillic а inside Latin letters"],
    ["Ashaआ", "Devanagari inside a Latin word"],
    ["आशाa", "Latin inside a Devanagari word"],
    ["fսck", "Armenian letter inside Latin letters"],
    ["Ασha", "Greek capital alpha with Latin letters"],
  ])("rejects a word that mixes scripts: %j (%s)", (input) => {
    const result = validateName(input);
    expect(result.ok).toBe(false);
  });

  it("allows different scripts in different words, and marks stay with their letter", () => {
    expect(validateName("Raj आशा").ok).toBe(true);
    expect(validateName("आशा-Verma").ok).toBe(true);
    expect(validateName("Sonaa’ Rao").ok).toBe(true);
  });

  it("does not let a look-alike spelling of a blocked phrase pass as a name", () => {
    // These are refused as a bad format (they never reach the profile); the helpline is for typed phrases.
    expect(validateName("ѕuicide")).toEqual(format);
    expect(validateName("kіll myself")).toEqual(format); // Cyrillic і
  });

  it("rejects a non-string defensively", () => {
    expect(validateName(undefined as unknown as string)).toEqual(format);
    expect(validateName(42 as unknown as string)).toEqual(format);
  });
});

describe("validateName: blocked words", () => {
  it.each([
    "suicide",
    "Suicide",
    "SUICIDE.",
    "suicidal",
    "kill myself",
    "I want to die",
    "i  WANT   to   die!!",
    "I want to die tonight, please help me", // over 30 characters: still the helpline, not "too long"
    "Sûicide", // accent
    "k i l l  m y s e l f", // spread out
    "end my life",
    "Mujhe marna hai",
    "main jeena nahi chahta",
    "मैं मरना चाहता हूँ",
    "आत्महत्या",
    "aatmahatya",
  ])("stops %j with the helpline (self-harm)", (input) => {
    expect(validateName(input)).toEqual(blocked);
  });

  it.each([
    "idiot",
    "You are an Idiot",
    "FUCK",
    "madarchod",
    "Madar Chod",
    "behenchod",
    "chutiya",
    "gandu",
    "चूतिया",
    "बहनचोद",
  ])("asks again for %j (abuse: no helpline)", (input) => {
    expect(validateName(input)).toEqual(abusive);
  });

  it("checks self-harm before abuse (a distress phrase containing an abuse word still gets the helpline)", () => {
    expect(validateName("fuck i want to die")).toEqual(blocked);
  });

  it("does not block harmless names that only contain a blocked term as part of a word", () => {
    // whole-word matching: "Diego" contains "die" and "Shitij" starts with "shit", but neither is a blocked word
    for (const name of ["Diego", "Dieter", "Ida", "Cassidy", "Shitij"]) {
      expect(validateName(name).ok, name).toBe(true);
    }
  });

  it("blocks a term whose letters are separated by dots", () => {
    expect(validateName("s.u.i.c.i.d.e")).toEqual(blocked);
  });

  it("uses the list it is given (the client's list replaces the placeholder)", () => {
    expect(validateName("Rohan", lists(["rohan"]))).toEqual(blocked);
    expect(validateName("Rohan", lists([], ["rohan"]))).toEqual(abusive);
    expect(validateName("suicide", lists(["something else"]))).toEqual(ok("suicide"));
    expect(validateName("Rohan", lists([]))).toEqual(ok("Rohan"));
  });

  it("ignores empty or symbol-only terms in the list", () => {
    expect(validateName("Asha", lists(["", "   ", "!!!"], ["", "!!!"]))).toEqual(ok("Asha"));
  });

  it("checks blocked words before format, so punctuation cannot hide a distress phrase", () => {
    expect(validateName("kill myself!!!")).toEqual(blocked);
    expect(validateName("kill-myself")).toEqual(blocked);
  });
});

describe("placeholder blocklists", () => {
  it.each([
    ["self-harm", SELF_HARM_TERMS],
    ["abuse", ABUSE_TERMS],
  ])("%s list is non-empty, lowercase and has no duplicates", (_name, terms) => {
    expect(terms.length).toBeGreaterThan(0);
    expect(new Set(terms).size).toBe(terms.length);
    for (const term of terms) expect(term).toBe(term.toLowerCase());
  });

  it("keeps the two lists apart (no term in both, since they have different outcomes)", () => {
    const abuse = new Set(ABUSE_TERMS);
    for (const term of SELF_HARM_TERMS) expect(abuse.has(term), term).toBe(false);
  });

  it("is what validateName uses by default", () => {
    expect(NAME_BLOCKLISTS.selfHarm).toBe(SELF_HARM_TERMS);
    expect(NAME_BLOCKLISTS.abuse).toBe(ABUSE_TERMS);
  });

  it("leaves out words that are also real names or community names (a real person must not be stopped)", () => {
    const all = [...SELF_HARM_TERMS, ...ABUSE_TERMS];
    for (const term of ["lund", "randi", "kanjar", "hijra", "bhangi", "gucchi", "paki"]) {
      expect(all, term).not.toContain(term);
    }
  });

  // A real name that equals a blocked word would be told to enter "a real name" and could not continue.
  // These are common Indian first names and surnames in Latin letters and Devanagari. Extend the sample as needed.
  it("does not block or flag common Indian names", () => {
    const names = [
      "Asha",
      "Aarav",
      "Aditya",
      "Akash",
      "Amit",
      "Ananya",
      "Anjali",
      "Arjun",
      "Ashish",
      "Ayesha",
      "Deepak",
      "Divya",
      "Gandhi",
      "Ganesh",
      "Gauri",
      "Harish",
      "Harsh",
      "Ishaan",
      "Kavya",
      "Kiran",
      "Krishna",
      "Lakshmi",
      "Manish",
      "Meera",
      "Mohit",
      "Neha",
      "Nikhil",
      "Pooja",
      "Priya",
      "Rahul",
      "Raj",
      "Randhir",
      "Rohan",
      "Sachin",
      "Sanjay",
      "Shivam",
      "Shreya",
      "Simran",
      "Sunita",
      "Suresh",
      "Tanvi",
      "Varun",
      "Vikram",
      "Vivek",
      "Yash",
      "Zoya",
      "Chandra",
      "Chetan",
      "Chhaya",
      "Chotu",
      "Gaurav",
      "Bhavna",
      "Bhushan",
      "Lokesh",
      "Lalit",
      "Lata",
      "Harini",
      "Hari",
      "Chandu",
      "आशा",
      "आरव",
      "आदित्य",
      "अनन्या",
      "अंजलि",
      "अर्जुन",
      "गौरव",
      "गणेश",
      "गौरी",
      "हरीश",
      "कृष्णा",
      "लक्ष्मी",
      "मीरा",
      "नेहा",
      "पूजा",
      "प्रिया",
      "राहुल",
      "रोहन",
      "सचिन",
      "सिमरन",
      "सुनीता",
      "वरुण",
      "विक्रम",
      "यश",
      "चंद्रा",
      "चेतन",
      "छाया",
      "भावना",
      "ललित",
      "लता",
      "हरि",
      "रंजीत",
      "रमेश",
      "रणवीर",
    ];
    for (const name of names) expect(validateName(name).ok, name).toBe(true);
  });
});

describe("validateName is pure", () => {
  it("gives the same answer every time", () => {
    for (const input of ["Asha", "suicide", "a1", "  Asha  "]) {
      expect(validateName(input)).toEqual(validateName(input));
    }
  });
});
