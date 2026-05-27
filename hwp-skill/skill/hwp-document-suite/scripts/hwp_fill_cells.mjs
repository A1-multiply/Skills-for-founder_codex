#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  node hwp_fill_cells.mjs <input.hwp> <output.hwp> --map <cells.json> [--clean-preset business-plan-guides] [--remove-nested-guides business-plan-overview] [--format-preset business-plan-overview-compact]

Map JSON:
  {
    "section": 0,
    "parentParagraph": 7,
    "control": 0,
    "cleanPreset": "business-plan-guides",
    "removeNestedGuidesPreset": "business-plan-overview",
    "formatPreset": "business-plan-overview-compact",
    "cells": {
      "1": "text for cell 1",
      "3": "text for cell 3"
    }
  }

Optional per-cell object:
  "5": { "text": "value", "cellParagraph": 0, "append": false }
`);
}

function readFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

const input = args[0];
const output = args[1];
const mapPath = readFlag("--map");
const cleanPresetArg = readFlag("--clean-preset");
const removeNestedGuidesArg = readFlag("--remove-nested-guides");
const formatPresetArg = readFlag("--format-preset");

if (!input || !output || !mapPath || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(input || output || mapPath ? 0 : 1);
}

const map = JSON.parse((await readFile(mapPath, "utf8")).replace(/^\uFEFF/, ""));
const section = Number(map.section ?? 0);
const parentParagraph = Number(map.parentParagraph);
const control = Number(map.control ?? 0);
const cleanPreset = cleanPresetArg || map.cleanPreset || null;
const removeNestedGuidesPreset = removeNestedGuidesArg || map.removeNestedGuidesPreset || null;
const formatPreset = formatPresetArg || map.formatPreset || null;

if (!Number.isInteger(parentParagraph)) {
  throw new Error("Map requires integer parentParagraph");
}

const cellEntries = Object.entries(map.cells ?? {});
if (cellEntries.length === 0) {
  throw new Error("Map requires at least one cell");
}

function run(commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    if (process.platform === "win32" && options.textFile) {
      const marker = "__HWP_TEXT_FILE__";
      const textIndex = commandArgs.indexOf(marker);
      if (textIndex === -1) {
        reject(new Error("Internal error: textFile option requires __HWP_TEXT_FILE__ marker"));
        return;
      }

      const beforeText = commandArgs.slice(0, textIndex);
      const afterText = commandArgs.slice(textIndex + 1);
      const script = [
        "$ErrorActionPreference = 'Stop'",
        `$text = Get-Content -Raw -Encoding UTF8 -LiteralPath ${quotePowerShellString(options.textFile)}`,
        `& ${quotePowerShellString(npx)} ${beforeText.map(quotePowerShellString).join(" ")} --text $text ${afterText.map(quotePowerShellString).join(" ")}`
      ].join("; ");

      execFile("powershell.exe", ["-NoProfile", "-Command", script], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed (${error.code ?? "unknown"}): powershell npx ${commandArgs.join(" ")}\n${stderr}`));
          return;
        }
        resolve({ stdout, stderr });
      });
      return;
    }

    execFile(npx, commandArgs, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed (${error.code ?? "unknown"}): npx ${commandArgs.join(" ")}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function runNode(commandArgs) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, commandArgs, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed (${error.code ?? "unknown"}): node ${commandArgs.join(" ")}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function parseJsonOrText(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const tempDir = await mkdtemp(path.join(tmpdir(), "hwp-fill-cells-"));
let current = input;

try {
  const needsPostProcess = cleanPreset || removeNestedGuidesPreset || formatPreset;
  const filledOutput = needsPostProcess ? path.join(tempDir, "filled-before-postprocess.hwp") : output;
  for (let index = 0; index < cellEntries.length; index += 1) {
    const [cellKey, rawValue] = cellEntries[index];
    const cell = Number(cellKey);
    if (!Number.isInteger(cell)) {
      throw new Error(`Cell key must be an integer: ${cellKey}`);
    }

    const spec = typeof rawValue === "object" && rawValue !== null ? rawValue : { text: rawValue };
    const text = String(spec.text ?? "");
    const textFile = path.join(tempDir, `cell-${index}.txt`);
    await writeFile(textFile, text, "utf8");
    const next = index === cellEntries.length - 1 ? filledOutput : path.join(tempDir, `step-${index}.hwp`);
    const commandArgs = [
      "--yes",
      "k-skill-rhwp",
      "set-cell-text",
      current,
      next,
      "--section",
      String(section),
      "--parent-paragraph",
      String(parentParagraph),
      "--control",
      String(control),
      "--cell",
      String(cell),
      "--text",
      process.platform === "win32" ? "__HWP_TEXT_FILE__" : text
    ];

    if (spec.cellParagraph !== undefined) {
      commandArgs.push("--cell-paragraph", String(spec.cellParagraph));
    }
    if (spec.append === true || spec.noReplace === true) {
      commandArgs.push("--no-replace");
    }

    await run(commandArgs, { textFile });
    current = next;
  }

  let cleanup = null;
  if (cleanPreset) {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const cleanupOutput = removeNestedGuidesPreset ? path.join(tempDir, "cleaned-before-nested-guide-removal.hwp") : output;
    const cleanupResult = await runNode([
      path.join(scriptDir, "hwp_clean_text.mjs"),
      current,
      cleanupOutput,
      "--preset",
      cleanPreset
    ]);
    cleanup = parseJsonOrText(cleanupResult.stdout);
    current = cleanupOutput;
  }

  let nestedGuideRemoval = null;
  if (removeNestedGuidesPreset) {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const nestedOutput = formatPreset ? path.join(tempDir, "nested-guides-removed-before-format.hwp") : output;
    const nestedResult = await runNode([
      path.join(scriptDir, "hwp_remove_nested_guides.mjs"),
      current,
      nestedOutput,
      "--preset",
      removeNestedGuidesPreset
    ]);
    nestedGuideRemoval = parseJsonOrText(nestedResult.stdout);
    current = nestedOutput;
  }

  let formatting = null;
  if (formatPreset) {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const formatResult = await runNode([
      path.join(scriptDir, "hwp_format_overview.mjs"),
      current,
      output,
      "--preset",
      formatPreset,
      "--parent-paragraph",
      String(parentParagraph)
    ]);
    formatting = parseJsonOrText(formatResult.stdout);
  }

  console.log(JSON.stringify({
    ok: true,
    outputPath: output,
    cellsWritten: cellEntries.length,
    cleanPreset,
    removeNestedGuidesPreset,
    formatPreset,
    cleanup,
    nestedGuideRemoval,
    formatting
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
