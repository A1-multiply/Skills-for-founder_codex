#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { execFile, execFileSync, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { hancomRequireNoExistingHwpPowerShell, hancomSecurityPowerShell } from "./hwp_hancom_security.mjs";

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  node hwp_remove_nested_guides.mjs <input.hwp> <output.hwp> --preset business-plan-overview
  node hwp_remove_nested_guides.mjs <input.hwp> <output.hwp> --preset business-plan-overview-only
  node hwp_remove_nested_guides.mjs <input.hwp> <output.hwp> --preset business-plan-all-guides

Purpose:
  Removes leftover nested guide tables from known HWP business-plan overview cells.
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

if (!["business-plan-overview", "business-plan-overview-only", "business-plan-all-guides"].includes(preset)) {
  throw new Error("Supported presets: business-plan-overview, business-plan-overview-only, business-plan-all-guides");
}

if (process.platform === "win32") {
  await removeWithHancomCom(input, output, preset);
  process.exit(0);
}

const core = await loadRhwpCore();
const source = await readFile(input);
const doc = new core.HwpDocument(new Uint8Array(source));

try {
  const table = { section: 0, parentParagraph: 7, control: 0 };
  const targetCells = [1, 3, 5, 7, 9, 11, 13];
  let rangesDeleted = 0;
  let nestedTablesDeleted = 0;

  for (const cell of targetCells) {
    for (let nestedControl = 9; nestedControl >= 0; nestedControl -= 1) {
      const path = JSON.stringify([
        { controlIndex: table.control, cellIndex: cell, cellParaIndex: 0 },
        { controlIndex: nestedControl }
      ]);
      try {
        doc.getTableDimensionsByPath(table.section, table.parentParagraph, path);
      } catch {
        continue;
      }
      try {
        const textLength = doc.getCellParagraphLengthByPath(table.section, table.parentParagraph, path);
        if (textLength >= 0) {
          parseJsonResult(
            doc.deleteRangeInCellByPath(table.section, table.parentParagraph, path, 0, textLength),
            "deleteRangeInCellByPath"
          );
        }
      } catch {
        // Some empty nested tables have no readable paragraph; deletion below still handles them.
      }
      nestedTablesDeleted += 1;
    }

    const count = doc.getCellParagraphCount(table.section, table.parentParagraph, table.control, cell);
    for (let para = count - 1; para >= 0; para -= 1) {
      const length = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, para);
      if (para === 0) {
        for (const extra of [1, 2, 5, 20]) {
          try {
            parseJsonResult(
              doc.deleteRangeInCell(
                table.section,
                table.parentParagraph,
                table.control,
                cell,
                para,
                length,
                para,
                length + extra
              ),
              "deleteRangeInCell"
            );
            rangesDeleted += 1;
            break;
          } catch {
            // Some hidden controls are not represented in the visible text length.
          }
        }
      }
      if (para === 0) {
        const text = length > 0
          ? doc.getTextInCell(table.section, table.parentParagraph, table.control, cell, para, 0, length)
          : "";
        const keepLength = visibleTextLength(text);
        if (length > keepLength) {
          parseJsonResult(
            doc.deleteRangeInCell(
              table.section,
              table.parentParagraph,
              table.control,
              cell,
              para,
              keepLength,
              para,
              length
            ),
            "deleteRangeInCell"
          );
          rangesDeleted += 1;
        }
      } else {
        parseJsonResult(
          doc.deleteRangeInCell(
            table.section,
            table.parentParagraph,
            table.control,
            cell,
            para,
            0,
            para,
            length
          ),
          "deleteRangeInCell"
        );
        rangesDeleted += 1;
      }
    }
  }

  await writeFile(output, Buffer.from(doc.exportHwp()));
  console.log(JSON.stringify({ ok: true, outputPath: output, rangesDeleted, nestedTablesDeleted }, null, 2));
} finally {
  doc.free();
}

function visibleTextLength(text) {
  const marker = "[以묒꺽 ?뚯씠釉?;
  const index = String(text).indexOf(marker);
  if (index >= 0) return index;
  return String(text).length;
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
  const wasmBytes = await readFile(wasmPath);
  await core.default({ module_or_path: wasmBytes });
  return core;
}

function ensureRhwpCore() {
  const installDir = path.join(os.tmpdir(), "A1-HWP-SKILL-rhwp-core");
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

function removeWithHancomCom(inputPath, outputPath, presetName) {
  const startIndex = presetName === "business-plan-overview-only" ? 7 : (presetName === "business-plan-all-guides" ? 12 : 13);
  const endIndex = presetName === "business-plan-overview-only" ? 15 : 21;
  const openFormat = path.extname(inputPath).toLowerCase() === ".hwpx" ? "HWPX" : "HWP";
  const script = `
$ErrorActionPreference = 'Stop'
$inputPath = ${quotePowerShellString(path.resolve(inputPath))}
$outputPath = ${quotePowerShellString(path.resolve(outputPath))}
$openFormat = ${quotePowerShellString(openFormat)}
${hancomRequireNoExistingHwpPowerShell()}
$hwp = New-Object -ComObject HWPFrame.HwpObject
$hwp.SetMessageBoxMode(0x00020000) | Out-Null
${hancomSecurityPowerShell(import.meta.url)}
$opened = $hwp.Open($inputPath, $openFormat, 'forceopen:true;readonly:false')
if (-not $opened) { throw 'Hancom HWP failed to open input file.' }
$ctrls = @()
$ctrl = $hwp.HeadCtrl
$index = 0
while ($null -ne $ctrl -and $index -lt 120) {
  if ($index -ge ${startIndex} -and $index -le ${endIndex} -and $ctrl.CtrlID -eq 'tbl') {
    $ctrls += $ctrl
  }
  $ctrl = $ctrl.Next
  $index += 1
}
[array]::Reverse($ctrls)
$deleted = 0
foreach ($target in $ctrls) {
  $hwp.DeleteCtrl($target) | Out-Null
  $deleted += 1
}
$hwp.SaveAs($outputPath, 'HWP', '') | Out-Null
$hwp.Quit()
Write-Output (@{ ok = $true; outputPath = $outputPath; controlsDeleted = $deleted; method = 'hancom-com' } | ConvertTo-Json -Compress)
`;

  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Hancom COM cleanup failed: ${stderr || error.message}`));
        return;
      }
      process.stdout.write(stdout);
      resolve();
    });
  });
}

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
