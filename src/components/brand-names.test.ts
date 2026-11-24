// The product and guide names are working names (CLAUDE.md, src/config/brand.ts): no page or component may spell them
// out, so a rename is a one-line change. Comments may mention them; only code and strings count.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const DIRS = ["src/app", "src/components"].map((dir) => path.join(root, dir));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** Current and past product and guide names (D92 renamed Meera to Mira; Sage and CDL are prototype names). */
const NAMES = /\b(?:SELF|CDL|Mira|Meera|Sage)\b/;

const files = DIRS.flatMap(sourceFiles);

describe("no page or component hardcodes the product or guide name (use src/config/brand.ts)", () => {
  it("scans the app and the components", () => {
    const names = files.map((f) => path.relative(root, f).split(path.sep).join("/"));
    expect(names).toContain("src/app/layout.tsx");
    expect(names).toContain("src/components/site/navbar.tsx");
  });

  it("catches a name in code but not in a comment", () => {
    expect(stripComments('const title = "SELF home";')).toMatch(NAMES);
    expect(stripComments("// the My SELF card\nconst a = 1;")).not.toMatch(NAMES);
  });

  it.each(files.map((file) => [path.relative(root, file), file] as const))("%s", (_name, file) => {
    expect(stripComments(readFileSync(file, "utf8")).match(NAMES)?.[0]).toBeUndefined();
  });
});
