#!/usr/bin/env node
import { exec, execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  node hwp_inspect.mjs <input.hwp|input.hwpx|input.hwpml> [--out-dir ./out] [--basename name]

Outputs:
  <basename>.json
  <basename>.md
  <basename>.summary.md
`);
}

function readFlag(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

const input = args.find((arg) => !arg.startsWith("--") && !["--out-dir", "--basename"].includes(arg));
if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

if (!input) {
  usage();
  process.exit(1);
}

const ext = path.extname(input).toLowerCase();
if (![".hwp", ".hwpx", ".hwpml"].includes(ext)) {
  throw new Error(`Unsupported file extension: ${ext || "(none)"}`);
}

const outDir = readFlag("--out-dir", "./out");
const basename = readFlag("--basename", path.basename(input, ext));

function run(commandArgs) {
  return new Promise((resolve, reject) => {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    if (process.platform === "win32") {
      const command = `${npx} ${commandArgs.map(quoteWindowsArg).join(" ")}`;
      exec(command, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed (${error.code ?? "unknown"}): ${command}\n${stderr}`));
          return;
        }
        resolve({ stdout, stderr });
      });
      return;
    }

    execFile(npx, commandArgs, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed (${error.code ?? "unknown"}): npx ${commandArgs.join(" ")}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function quoteWindowsArg(value) {
  const text = String(value);
  return `"${text.replace(/"/g, '\\"')}"`;
}

function countBlocks(blocks) {
  const counts = {};
  for (const block of Array.isArray(blocks) ? blocks : []) {
    const type = block?.type || block?.kind || "unknown";
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function firstText(value, limit = 180) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function summarize(parsed, markdown) {
  const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
  const counts = countBlocks(blocks);
  const tableBlocks = blocks.filter((block) => String(block?.type || block?.kind || "").toLowerCase().includes("table"));
  const imageBlocks = blocks.filter((block) => String(block?.type || block?.kind || "").toLowerCase().includes("image"));
  const headings = markdown
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s+\S/.test(line))
    .slice(0, 50);

  const lines = [
    "# HWP Inspection Summary",
    "",
    `- Source: ${input}`,
    `- Parse success: ${parsed?.success !== false}`,
    `- Markdown characters: ${markdown.length}`,
    `- Block count: ${blocks.length}`,
    `- Table-like blocks: ${tableBlocks.length}`,
    `- Image-like blocks: ${imageBlocks.length}`,
    "",
    "## Block Types",
    "",
    ...Object.entries(counts).sort().map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Headings",
    "",
    ...(headings.length ? headings.map((line) => `- ${line.replace(/^#+\s*/, "")}`) : ["- No Markdown headings detected."]),
    "",
    "## Table Previews",
    "",
    ...(tableBlocks.length
      ? tableBlocks.slice(0, 20).map((block, index) => `- Table ${index + 1}: ${firstText(JSON.stringify(block))}`)
      : ["- No table-like blocks detected."]),
    "",
    "## Notes",
    "",
    "- Review the JSON file for exact block metadata, coordinates, controls, and table structure.",
    "- Review the Markdown file for user-facing prose and readable table content."
  ];

  return `${lines.join("\n")}\n`;
}

await mkdir(outDir, { recursive: true });

const jsonResult = await run(["--yes", "--package", "kordoc", "--package", "pdfjs-dist", "kordoc", input, "--format", "json"]);
let parsed;
try {
  parsed = JSON.parse(jsonResult.stdout);
} catch {
  parsed = { success: false, rawOutput: jsonResult.stdout, parseError: "kordoc output was not valid JSON" };
}

let markdown = typeof parsed?.markdown === "string" ? parsed.markdown : "";
if (!markdown) {
  const mdResult = await run(["--yes", "--package", "kordoc", "--package", "pdfjs-dist", "kordoc", input]);
  markdown = mdResult.stdout;
}

const jsonPath = path.join(outDir, `${basename}.json`);
const mdPath = path.join(outDir, `${basename}.md`);
const summaryPath = path.join(outDir, `${basename}.summary.md`);

await writeFile(jsonPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
await writeFile(mdPath, markdown, "utf8");
await writeFile(summaryPath, summarize(parsed, markdown), "utf8");

console.log(JSON.stringify({ ok: true, jsonPath, mdPath, summaryPath }, null, 2));
