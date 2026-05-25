#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  node hwp_edit.mjs <k-skill-rhwp-command> [...args]

Examples:
  node hwp_edit.mjs info ./input.hwp
  node hwp_edit.mjs search ./input.hwp --query "2025"
  node hwp_edit.mjs replace-all ./input.hwp ./out/edited.hwp --query "2025" --replacement "2026"
  node hwp_edit.mjs insert-text ./input.hwp ./out/edited.hwp --section 0 --paragraph 0 --offset 0 --text "Title"
`);
  process.exit(0);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(npx, ["--yes", "k-skill-rhwp", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`k-skill-rhwp stopped by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
