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
  node hwp_fit_overview_page.mjs <input.hwp> <output.hwp> [--section 0] [--parent-paragraph 1] [--control 0]

Purpose:
  Keeps the overview table inside the page without changing headings or text outside the table.
  Fixes abnormal table offsets that can appear after Hancom/image automation.
`);
}

function readFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

const input = args[0];
const output = args[1];
if (!input || !output) {
  usage();
  process.exit(1);
}

const result = await fitOverviewTableToPage(input, output, {
  section: Number(readFlag("--section") ?? 0),
  parentParagraph: readFlag("--parent-paragraph"),
  control: readFlag("--control")
});
console.log(JSON.stringify(result, null, 2));

export async function fitOverviewTableToPage(inputPath, outputPath, options = {}) {
  installMeasureTextWidthShim();
  const core = await loadRhwpCore();
  const doc = new core.HwpDocument(new Uint8Array(await readFile(inputPath)));
  try {
    const table = resolveTable(doc, options);
    const before = JSON.parse(doc.getTableProperties(table.section, table.parentParagraph, table.control));
    const operations = [];

    if (Number.isFinite(before.vertOffset) && Math.abs(before.vertOffset) > 1000) {
      parseJsonResult(
        doc.moveTableOffset(table.section, table.parentParagraph, table.control, 0, -before.vertOffset),
        "moveTableOffset"
      );
      operations.push({ op: "reset-vertical-offset", from: before.vertOffset, to: 0 });
    }

    if (Number.isFinite(before.horzOffset) && Math.abs(before.horzOffset) > 1000) {
      parseJsonResult(
        doc.moveTableOffset(table.section, table.parentParagraph, table.control, -before.horzOffset, 0),
        "moveTableOffset"
      );
      operations.push({ op: "reset-horizontal-offset", from: before.horzOffset, to: 0 });
    }

    const after = JSON.parse(doc.getTableProperties(table.section, table.parentParagraph, table.control));
    await writeFile(outputPath, Buffer.from(doc.exportHwp()));
    return {
      ok: true,
      method: "rhwp-overview-table-page-fit",
      outputPath,
      table,
      operations,
      before: pickTableFitProps(before),
      after: pickTableFitProps(after)
    };
  } finally {
    doc.free();
  }
}

function resolveTable(doc, options) {
  const section = Number(options.section ?? 0);
  const parentParagraph = options.parentParagraph === undefined || options.parentParagraph === null
    ? null
    : Number(options.parentParagraph);
  const control = options.control === undefined || options.control === null ? 0 : Number(options.control);
  if (Number.isInteger(parentParagraph) && isTable(doc, section, parentParagraph, control)) {
    return { section, parentParagraph, control };
  }

  for (let pp = 0; pp < 120; pp += 1) {
    for (let ci = 0; ci < 16; ci += 1) {
      if (!isTable(doc, section, pp, ci)) continue;
      const dims = JSON.parse(doc.getTableDimensions(section, pp, ci));
      if ((dims.cellCount ?? 0) >= 8) return { section, parentParagraph: pp, control: ci };
    }
  }
  throw new Error("No overview table found for page-fit correction.");
}

function isTable(doc, section, parentParagraph, control) {
  try {
    doc.getTableDimensions(section, parentParagraph, control);
    return true;
  } catch {
    return false;
  }
}

function pickTableFitProps(props) {
  return {
    tableHeight: props.tableHeight,
    tableWidth: props.tableWidth,
    pageBreak: props.pageBreak,
    treatAsChar: props.treatAsChar,
    textWrap: props.textWrap,
    vertRelTo: props.vertRelTo,
    vertAlign: props.vertAlign,
    vertOffset: props.vertOffset,
    horzRelTo: props.horzRelTo,
    horzAlign: props.horzAlign,
    horzOffset: props.horzOffset,
    restrictInPage: props.restrictInPage,
    keepWithAnchor: props.keepWithAnchor
  };
}

function parseJsonResult(raw, op) {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.ok !== true) throw new Error(`${op} failed: ${raw}`);
  return parsed;
}

async function loadRhwpCore() {
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
      execSync(`${npm} install @rhwp/core@^0.7.12 --no-audit --no-fund`, { cwd: installDir, stdio: "ignore" });
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
