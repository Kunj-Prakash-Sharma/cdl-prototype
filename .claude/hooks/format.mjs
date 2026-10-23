// PostToolUse: run Prettier on the file Claude just edited. Never blocks.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join } from "node:path";

const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"]);

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const file = input?.tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const prettier = join(root, "node_modules", ".bin", "prettier");

if (file && EXT.has(extname(file)) && existsSync(file) && existsSync(prettier)) {
  try {
    execFileSync(prettier, ["--write", "--log-level", "silent", file], { stdio: "ignore" });
  } catch {
    // formatting problems are reported by CI lint, not by this hook
  }
}
process.exit(0);
