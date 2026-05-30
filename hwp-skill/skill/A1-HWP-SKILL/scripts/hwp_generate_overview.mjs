#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const require = createRequire(import.meta.url);

function usage() {
  console.log(`Usage:
  node hwp_generate_overview.mjs --spec overview.json

overview.json:
{
  "template": "clean-template.hwp",
  "output": "final.hwp",
  "fontFamily": "?⑥큹濡щ컮??,
  "cells": {
    "1": ["?꾩씠?쒕챸"],
    "3": ["吏㏃? 移댄뀒怨좊━"],
    "5": ["[?쒕ぉ]", "- bullet"]
  },
  "images": [
    { "marker": "IMG_PRODUCT", "path": "./images/product.png" },
    { "marker": "IMG_FLOW", "path": "./images/flow.png" }
  ]
}
`);
}

function readFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const specPath = readFlag("--spec");
if (!specPath || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(specPath ? 0 : 1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(await readFile(specPath, "utf8"));
const input = path.resolve(required(spec.template, "template"));
const output = path.resolve(required(spec.output, "output"));
const workDir = await mkdtemp(path.join(tmpdir(), "hwp-overview-"));

try {
  const rawOutput = spec.images?.length ? path.join(workDir, "overview-raw.hwp") : output;
  await writeCellsWithRhwp(input, rawOutput, {
    section: Number(spec.section ?? 0),
    parentParagraph: Number(spec.parentParagraph ?? 1),
    control: Number(spec.control ?? 0),
    fontFamily: spec.fontFamily ?? "?⑥큹濡щ컮??,
    emphasis: spec.emphasis ?? {},
    cells: spec.cells ?? {}
  });

  if (spec.images?.length) {
    const imagesPath = path.join(workDir, "images.json");
    await writeFile(imagesPath, JSON.stringify({ items: spec.images }, null, 2), "utf8");
    await runNode("hwp_set_cell_background_images.mjs", [rawOutput, output, "--images", imagesPath]);
  }

  console.log(JSON.stringify({ ok: true, outputPath: output, images: spec.images?.length ?? 0 }, null, 2));
} finally {
  await rm(workDir, { recursive: true, force: true });
}

function required(value, name) {
  if (!value) throw new Error(`spec.${name} is required`);
  return String(value);
}

async function writeCellsWithRhwp(inputPath, outputPath, map) {
  const core = await loadRhwpCore();
  const doc = new core.HwpDocument(new Uint8Array(await readFile(inputPath)));
  const table = resolveTable(doc, map, map.cells ?? {});
  try {
    for (const [cellKey, value] of Object.entries(map.cells ?? {})) {
      const cell = Number(cellKey);
      if (!Number.isInteger(cell)) throw new Error(`Cell key must be an integer: ${cellKey}`);
      const lines = normalizeLines(cell, Array.isArray(value) ? value : String(value).split(/\r?\n/));
      if (!lines.length) continue;
      overwriteCell(doc, table, cell, lines);
      formatCell(doc, table, cell, lines, map);
    }
    await writeFile(outputPath, Buffer.from(doc.exportHwp()));
  } finally {
    doc.free();
  }
}

function resolveTable(doc, map, cells) {
  const start = {
    section: Number(map.section ?? 0),
    parentParagraph: Number(map.parentParagraph ?? 1),
    control: Number(map.control ?? 0)
  };
  if (isUsableTable(doc, start, cells)) return start;
  for (let parentParagraph = 0; parentParagraph < 100; parentParagraph += 1) {
    for (let control = 0; control < 16; control += 1) {
      const candidate = { section: start.section, parentParagraph, control };
      if (isUsableTable(doc, candidate, cells)) return candidate;
    }
  }
  throw new Error("No usable overview table found.");
}

function isUsableTable(doc, table, cells) {
  try {
    const probes = Object.keys(cells).map(Number).filter(Number.isInteger).slice(0, 6);
    for (const cell of probes) doc.getCellParagraphCount(table.section, table.parentParagraph, table.control, cell);
    return true;
  } catch {
    return false;
  }
}

function normalizeLines(cell, rawLines) {
  const lines = rawLines.map((line) => String(line).trimEnd()).filter((line) => line.trim().length > 0);
  if (cell !== 3) return lines;
  return [lines.join(" ").replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ").trim()].filter(Boolean);
}

function overwriteCell(doc, table, cell, lines) {
  const paragraphCount = doc.getCellParagraphCount(table.section, table.parentParagraph, table.control, cell);
  const lastPara = Math.max(0, paragraphCount - 1);
  const lastLength = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, lastPara);
  try {
    parseJsonResult(doc.deleteRangeInCell(table.section, table.parentParagraph, table.control, cell, 0, 0, lastPara, lastLength), "deleteRangeInCell");
  } catch {
    for (let para = paragraphCount - 1; para >= 0; para -= 1) {
      const length = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, para);
      if (length > 0) parseJsonResult(doc.deleteTextInCell(table.section, table.parentParagraph, table.control, cell, para, 0, length), "deleteTextInCell");
    }
  }
  parseJsonResult(doc.insertTextInCell(table.section, table.parentParagraph, table.control, cell, 0, 0, lines[0] ?? ""), "insertTextInCell");
  for (let i = 1; i < lines.length; i += 1) {
    const prevLength = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, i - 1);
    const split = parseJsonResult(doc.splitParagraphInCell(table.section, table.parentParagraph, table.control, cell, i - 1, prevLength), "splitParagraphInCell");
    parseJsonResult(doc.insertTextInCell(table.section, table.parentParagraph, table.control, cell, Number(split.cellParaIndex ?? i), 0, lines[i]), "insertTextInCell");
  }
}

function formatCell(doc, table, cell, lines, map) {
  const profile = getProfile(cell, lines.length);
  const emphasis = map.emphasis?.[String(cell)];
  const fontFamily = map.fontFamily ?? "?⑥큹濡щ컮??;
  for (let para = 0; para < lines.length; para += 1) {
    const length = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, para);
    if (length <= 0) continue;
    const isHeadline = /^\s*\[[^\]]+\]\s*$/.test(lines[para]);
    const isCaption = cell === 17 || cell === 18;
    const isEmphasis = emphasis && para === resolveLineIndex(emphasis.line, lines.length);
    parseJsonResult(doc.applyCharFormatInCell(table.section, table.parentParagraph, table.control, cell, para, 0, length, JSON.stringify({
      fontFamily,
      fontSize: isEmphasis ? Number(emphasis.fontSize ?? profile.fontSize) : profile.fontSize,
      bold: isHeadline || isCaption || Boolean(isEmphasis && emphasis.bold !== false),
      italic: false,
      underline: false,
      textColor: isEmphasis ? String(emphasis.color ?? "#000000") : "#000000"
    })), "applyCharFormatInCell");
    try {
      parseJsonResult(doc.applyParaFormatInCell(table.section, table.parentParagraph, table.control, cell, para, JSON.stringify({
        align: isCaption ? "center" : isEmphasis ? String(emphasis.align ?? "left") : "left",
        lineSpacing: profile.lineSpacing
      })), "applyParaFormatInCell");
    } catch {}
  }
}

function getProfile(cell, lineCount) {
  if (cell === 1 || cell === 3) return { fontSize: 1100, lineSpacing: 130 };
  if (cell === 17 || cell === 18) return { fontSize: 1000, lineSpacing: 120 };
  if (lineCount >= 8) return { fontSize: 900, lineSpacing: 112 };
  if (lineCount >= 6) return { fontSize: 950, lineSpacing: 118 };
  return { fontSize: 1050, lineSpacing: 130 };
}

function resolveLineIndex(line, length) {
  const n = Number(line ?? -1);
  return n < 0 ? Math.max(0, length + n) : n;
}

function parseJsonResult(raw, op) {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.ok !== true) throw new Error(`${op} failed: ${raw}`);
  return parsed;
}

async function loadRhwpCore() {
  installMeasureTextWidthShim();
  const installDir = ensureRhwpCore();
  const core = await import(pathToFileUrl(path.join(installDir, "node_modules", "@rhwp", "core", "rhwp.js")));
  await core.default({ module_or_path: await readFile(path.join(installDir, "node_modules", "@rhwp", "core", "rhwp_bg.wasm")) });
  return core;
}

function ensureRhwpCore() {
  const installDir = path.join(tmpdir(), "A1-HWP-SKILL-rhwp-core");
  mkdirSync(installDir, { recursive: true });
  try {
    require(path.join(installDir, "node_modules", "@rhwp", "core", "package.json"));
  } catch {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    if (process.platform === "win32") {
      execSync(`${npm} install @rhwp/core@^0.7.12 --no-audit --no-fund`, { cwd: installDir, stdio: "ignore" });
    } else {
      execFileSync(npm, ["install", "@rhwp/core@^0.7.12", "--no-audit", "--no-fund"], { cwd: installDir, stdio: "ignore" });
    }
  }
  return installDir;
}

function installMeasureTextWidthShim() {
  if (typeof globalThis.measureTextWidth === "function") return;
  globalThis.measureTextWidth = (font, text) => {
    const size = Number(String(font || "").match(/([0-9.]+)px/)?.[1] ?? 12);
    let width = 0;
    for (const ch of String(text || "")) width += (ch.codePointAt(0) ?? 0) >= 0x1100 ? size : size * 0.55;
    return width;
  };
}

function pathToFileUrl(filePath) {
  return `file:///${path.resolve(filePath).replace(/\\/g, "/").replace(/ /g, "%20")}`;
}

function runNode(scriptName, scriptArgs) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(scriptDir, scriptName), ...scriptArgs], {
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${scriptName} failed: ${stderr || stdout || error.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}
