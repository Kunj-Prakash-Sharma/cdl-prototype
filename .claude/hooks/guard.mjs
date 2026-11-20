// PreToolUse: block edits to drizzle migrations that are already committed.
// "Tracked in git" stands in for "already applied". New/custom migrations stay editable.
// Exit code 2 blocks the tool call and feeds stderr back to Claude.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { relative, resolve } from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const file = input?.tool_input?.file_path;
if (!file) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = relative(root, resolve(root, file)).split("\\").join("/");

if (/^drizzle\//.test(rel)) {
  let tracked = false;
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", rel], { cwd: root, stdio: "ignore" });
    tracked = true;
  } catch {
    tracked = false;
  }
  if (tracked) {
    console.error(
      `Blocked: ${rel} is a committed migration. Never edit applied migrations. ` +
        `Change src/modules/*/schema.ts and run \`npm run db:generate\` to create a new one.`,
    );
    process.exit(2);
  }
}
process.exit(0);
