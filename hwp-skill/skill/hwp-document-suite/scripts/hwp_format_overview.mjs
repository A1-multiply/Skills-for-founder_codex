#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  node hwp_format_overview.mjs <input.hwp> <output.hwp> --preset business-plan-overview-compact

Purpose:
  Applies compact black non-italic formatting to known business-plan overview cells.
`);
}

function readFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const input = args[0];
const output = args[1];
const preset = readFlag("--preset");

if (!input || !output || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(input || output ? 0 : 1);
}

if (preset !== "business-plan-overview-compact") {
  throw new Error("Supported preset: business-plan-overview-compact");
}

const core = await loadRhwpCore();
const doc = new core.HwpDocument(new Uint8Array(await readFile(input)));

try {
  const table = { section: 0, parentParagraph: 7, control: 0 };
  const textCells = [1, 3, 5, 7, 9, 11, 13];
  const compactProps = {
    fontFamily: "휴먼명조",
    fontSize: 900,
    bold: false,
    italic: false,
    underline: false,
    textColor: "#000000"
  };
  const titleProps = {
    fontFamily: "휴먼명조",
    fontSize: 950,
    bold: false,
    italic: false,
    underline: false,
    textColor: "#000000"
  };
  let formattedRanges = 0;

  for (const cell of textCells) {
    const paragraphCount = doc.getCellParagraphCount(table.section, table.parentParagraph, table.control, cell);
    for (let para = 0; para < paragraphCount; para += 1) {
      const length = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, para);
      if (length <= 0) continue;
      const props = cell === 1 || cell === 3 ? titleProps : compactProps;
      parseJsonResult(
        doc.applyCharFormatInCell(
          table.section,
          table.parentParagraph,
          table.control,
          cell,
          para,
          0,
          length,
          JSON.stringify(props)
        ),
        "applyCharFormatInCell"
      );
      try {
        parseJsonResult(
          doc.applyParaFormatInCell(
            table.section,
            table.parentParagraph,
            table.control,
            cell,
            para,
            JSON.stringify({ lineSpacing: 130, align: "left" })
          ),
          "applyParaFormatInCell"
        );
      } catch {
        // Paragraph formatting keys vary by rhwp build; character formatting is required.
      }
      formattedRanges += 1;
    }
  }

  await writeFile(output, Buffer.from(doc.exportHwp()));
  console.log(JSON.stringify({ ok: true, outputPath: output, formattedRanges }, null, 2));
} finally {
  doc.free();
}

function parseJsonResult(raw, op) {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.ok !== true) {
    throw new Error(`${op} failed: ${raw}`);
  }
  return parsed;
}

async function loadRhwpCore() {
  installMeasureTextWidthShim();
  const installDir = ensureRhwpCore();
  const core = await import(pathToFileUrl(path.join(installDir, "node_modules", "@rhwp", "core", "rhwp.js")));
  const wasmPath = path.join(installDir, "node_modules", "@rhwp", "core", "rhwp_bg.wasm");
  await core.default({ module_or_path: await readFile(wasmPath) });
  return core;
}

function ensureRhwpCore() {
  const installDir = path.join(os.tmpdir(), "hwp-document-suite-rhwp-core");
  mkdirSync(installDir, { recursive: true });
  try {
    require(path.join(installDir, "node_modules", "@rhwp", "core", "package.json"));
    return installDir;
  } catch {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    if (process.platform === "win32") {
      execSync(`${npm} install @rhwp/core@^0.7.12 --no-audit --no-fund`, {
        cwd: installDir,
        stdio: "ignore"
      });
    } else {
      execFileSync(npm, ["install", "@rhwp/core@^0.7.12", "--no-audit", "--no-fund"], {
        cwd: installDir,
        stdio: "ignore"
      });
    }
    return installDir;
  }
}

function installMeasureTextWidthShim() {
  if (typeof globalThis.measureTextWidth === "function") return;
  globalThis.measureTextWidth = (font, text) => {
    const match = String(font || "").match(/([0-9.]+)px/);
    const size = match ? parseFloat(match[1]) : 12;
    let width = 0;
    for (const ch of String(text || "")) {
      const cp = ch.codePointAt(0) ?? 0;
      width += cp >= 0x1100 && cp <= 0xffdc ? size : size * 0.55;
    }
    return width;
  };
}

function pathToFileUrl(filePath) {
  return `file:///${path.resolve(filePath).replace(/\\/g, "/").replace(/ /g, "%20")}`;
}
