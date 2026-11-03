// Guards decision D68: nothing the question set owns is hardcoded in the chat UI. If the client changes the questions,
// the number of questions, the parts of the quiz, the answer labels or the wording, no UI file may need to change.
// The UI draws the NextStep the server sends (src/modules/chat/types.ts). This test reads the source of every chat UI
// file and fails on question ids, counts, part names, scale words and server-only imports.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../..");
const uiDir = path.join(root, "src/components/discover");
const pageFile = path.join(root, "src/app/(learner)/discover/page.tsx");

// results-report.tsx is the old prototype report: it still uses the legacy aptitude/values code and is rewritten in
// the report block (docs/specs/chat.md, 4d). Remove it from this list when that file goes.
const EXCLUDED = new Set(["results-report.tsx"]);

const files = [
  ...readdirSync(uiDir)
    .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) && !EXCLUDED.has(name))
    .map((name) => path.join(uiDir, name)),
  pageFile,
];

/** Comments may explain the rules in words; only code and strings count. */
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const RULES: { name: string; pattern: RegExp; bad: string }[] = [
  { name: "a question id", pattern: /\b[or]-[A-Z]-\d\b|\bb-(?:name|age|status|goal)\b/, bad: 'const id = "o-O-1";' },
  {
    name: "a question or step count",
    pattern: /(?<![\w.$/-])(?:10|12|22|26|30)(?![\w.%-])/,
    bad: "const total = 26;",
  },
  {
    name: "the size of the answer scale",
    pattern: /(?:[<>]=?|===?)\s*5\b|Array\(\s*5\s*\)|length:\s*5\b|\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/,
    bad: "if (value >= 1 && value <= 5) {}",
  },
  {
    name: "a name of a part of the quiz",
    pattern: /\b(?:ocean|riasec|personality|aptitude|interests?|strengths|work values)\b/i,
    bad: 'const title = "Personality";',
  },
  {
    name: "scale wording that belongs to the set",
    pattern: /\b(?:disagree|agree|strongly)\b/i,
    bad: "<span>Agree</span>",
  },
  {
    name: "a time or length promise",
    pattern: /\babout\s+\d+\s+(?:minutes?|questions?)\b|\b\d+\s+(?:short\s+)?assessments?\b/i,
    bad: "About 12 minutes",
  },
  {
    name: "the guide or product name (use src/config/brand.ts)",
    pattern: /\b(?:Sage|Meera|SELF)\b/,
    bad: 'const n = "Meera";',
  },
  {
    name: "an import of server-only data or old state",
    pattern:
      /@\/lib\/store|modules\/chat\/legacy|question-set|question-pool|\/variants|name-blocklist|name-check|localStorage/,
    bad: 'import { x } from "@/modules/chat/question-set";',
  },
  { name: "a raw colour (use tokens)", pattern: /#[0-9a-fA-F]{3,8}\b|\brgb\(/, bad: 'className="text-[#fff]"' },
];

describe("the chat UI hardcodes nothing the question set owns (D68)", () => {
  it("scans the files it should", () => {
    const names = files.map((f) => path.basename(f));
    for (const expected of ["chat-flow.tsx", "scale-question.tsx", "chat-card.tsx", "status-screens.tsx", "page.tsx"]) {
      expect(names, expected).toContain(expected);
    }
    expect(names).not.toContain("results-report.tsx");
  });

  it.each(RULES)("each rule can catch what it is for: $name", ({ pattern, bad }) => {
    expect(stripComments(bad)).toMatch(pattern);
  });

  it("ignores words inside comments", () => {
    expect(stripComments("// the Personality part, 12 questions\nconst a = 1;")).not.toMatch(RULES[3]!.pattern);
    expect(stripComments("/* o-O-1 */ const a = 1;")).not.toMatch(RULES[0]!.pattern);
  });

  it.each(files.map((file) => [path.relative(root, file), file] as const))("%s", (_name, file) => {
    const code = stripComments(readFileSync(file, "utf8"));
    const found = RULES.filter((rule) => rule.pattern.test(code)).map((rule) => {
      const match = code.match(rule.pattern)!;
      return `${rule.name}: "${match[0]}"`;
    });
    expect(found).toEqual([]);
  });
});
