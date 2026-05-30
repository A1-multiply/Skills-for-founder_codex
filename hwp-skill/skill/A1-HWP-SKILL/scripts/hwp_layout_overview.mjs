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
  node hwp_layout_overview.mjs <input.hwp> <output.hwp> --preset pork-grill-overview
  node hwp_layout_overview.mjs <input.hwp> <output.hwp> --layout-map cells.json

Purpose:
  Rewrites the 2026 preliminary startup-package overview table as readable Korean bullet paragraphs.
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
const layoutMapPath = readFlag("--layout-map");

if (!input || !output || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(input || output ? 0 : 1);
}

if (preset !== "pork-grill-overview" && !layoutMapPath) {
  throw new Error("Supported preset: pork-grill-overview, or pass --layout-map <json>");
}

const layoutMap = layoutMapPath ? await readLayoutMap(layoutMapPath) : null;

if (layoutMap?.cells) {
  const result = await layoutCellsWithRhwp(input, output, layoutMap);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (process.platform === "win32") {
  const result = await layoutWithHancomCom(input, output, layoutMap ? readLayoutReplacementsFromMap(layoutMap) : null);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const core = await loadRhwpCore();
const doc = new core.HwpDocument(new Uint8Array(await readFile(input)));

try {
  const table = { section: 0, parentParagraph: 7, control: 0 };
  const cells = {
    1: ["?쒗뭹 ?먮룞???μ튂 ?쒖뒪??],
    3: ["?뚯떇??二쇰갑 ?먮룞??/ ?먮즺援ъ씠 議곕━?λ퉬"],
    5: [
      "[ ?먮룞 ?뚯쟾?쇰줈 ?쒗뭹 援쎄린 ?덉쭏???쒖??뷀븯???낆냼???μ튂 ]",
      "- ?쒗뭹???쇱젙 ?띾룄濡??뚯쟾?쒖폒 ?욌뮘瑜?洹좎씪?섍쾶 議곕━",
      "- 吏곸썝 ?ㅼ쭛湲??낅Т, 援쎄린 ?몄감, 湲곕쫫 ?먯쓣 ?숈떆??媛먯냼",
      "- ?듭떖 湲곕뒫: ?뚯쟾 紐⑦꽣, ?먮즺 怨좎젙 ??? 湲곕쫫 諛곗텧 援ъ“",
      "- 湲곕??④낵: ?몃젰 遺??媛먯냼, ?뚯씠釉??뚯쟾??媛쒖꽑, 怨좉컼 遺덈쭔 媛먯냼"
    ],
    7: [
      "[ 怨좉퉫吏?援쎄린 ?덉쭏??吏곸썝 ?숇젴?꾩? ?쇳겕????곹솴??醫뚯슦??]",
      "- 援쎄린, 遺덊뙋 愿由? ?쒕튃??寃뱀퀜 議곕━ ?덉쭏 ?몄감 諛쒖깮",
      "- 怨좉컼 吏곸젒 議곕━ ???쒖?, ???듭쓬, ?곌린쨌湲곕쫫 ??遺덈쭔 諛섎났",
      "- 臾댄븳由ы븘쨌?⑥껜 留ㅼ옣? 援쎄린 愿由?遺?댁씠 ?뱁엳 ??,
      "- ?먮룞 ?뚯쟾 援ъ“濡?議곕━ ?덉쭏怨??묒뾽 ?⑥쑉???④퍡 媛쒖꽑"
    ],
    9: [
      "[ ?뚯쟾 議곕━ 援ъ“瑜??곸슜???쒖젣???쒖옉 諛??꾩옣 ?뚯뒪??異붿쭊 ]",
      "- 紐⑦꽣, 怨좎젙 ??? ?댁썝 媛꾧꺽, 湲곕쫫 諛곗텧 援ъ“瑜?寃고빀",
      "- ?뚯씠釉뷀삎쨌二쇰갑??2媛吏 紐⑤뜽濡??댁쁺 諛⑹떇蹂?寃利?,
      "- ?뚯뒪??留ㅼ옣 3~5怨녹뿉??議곕━ ?쒓컙, ?숈꽑, 怨좉컼 諛섏쓳 痢≪젙",
      "- ?덉쟾?? ?몄쿃?? ?닿뎄???쇰뱶諛?諛섏쁺 ???묒궛 援ъ“ 媛쒖꽑"
    ],
    11: [
      "[ ?쒗뭹 ?꾨Ц???쒖옣 吏꾩엯 ???뚰깉쨌?좎?蹂댁닔 紐⑤뜽濡??뺤옣 ]",
      "- 2026?? ?쒖젣???꾩꽦, ?뚯뒪??留ㅼ옣 ?뺣낫, ?꾩옣 寃利??곗씠???뺣낫",
      "- 2027?? ?쒗뭹 ?꾨Ц?먃룸Т?쒕━??留ㅼ옣 ????먮ℓ/?뚰깉 ?쒖옉",
      "- 2028?? ?꾨옖李⑥씠利??쒗쑕, ?좎?蹂댁닔 怨꾩빟, ?뚮え??留ㅼ텧 ?뺣?",
      "- ?κ린?곸쑝濡??먮즺 醫낅쪟蹂?紐⑤뱢??異붽???援ъ씠 ?먮룞???쇱씤??援ъ텞",
      "???????2030?꾧퉴吏 ?곕ℓ異?30?듭썝 ?ъ꽦 紐⑺몴"
    ],
    13: [
      "[ ?꾩옣 臾몄젣 ?뺤쓽, 湲곌뎄 ?ㅺ퀎, ?쒖뼱 媛쒕컻, 留ㅼ옣 寃利?以묒떖???ㅽ뻾 泥닿퀎 ]",
      "- ??쒖옄: 怨좉컼 臾몄젣 ?뺤쓽, ?쒗뭹 湲고쉷, ?ъ뾽???꾨왂 珥앷큵",
      "- 湲곌뎄 ?묐젰?? ?뚯쟾 援ъ“, ?먮즺 怨좎젙 ?μ튂, 湲곕쫫 諛곗텧遺 ?ㅺ퀎",
      "- ?꾧린쨌?쒖뼱 ?묐젰?? 紐⑦꽣 ?쒖뼱, ?띾룄 ?덉젙?? ?덉쟾 ?μ튂 媛쒕컻",
      "- ?뚯뒪??留ㅼ옣: 議곕━ ?덉쭏, ?묒뾽 ?⑥쑉, 怨좉컼 諛섏쓳 ?곗씠???쒓났"
    ]
  };

  let paragraphsWritten = 0;
  for (const [cellKey, lines] of Object.entries(cells)) {
    const cell = Number(cellKey);
    overwriteCellParagraphs(doc, table, cell, lines);
    paragraphsWritten += lines.length;
    formatCell(doc, table, cell, lines);
  }

  const rawOutput = process.platform === "win32" ? path.join(os.tmpdir(), `hwp-layout-${Date.now()}.hwp`) : output;
  await writeFile(rawOutput, Buffer.from(doc.exportHwp()));
  let normalized = null;
  if (process.platform === "win32") {
    normalized = await hancomResave(rawOutput, output);
  }
  console.log(JSON.stringify({ ok: true, outputPath: output, paragraphsWritten, normalized }, null, 2));
} finally {
  doc.free();
}

function overwriteCellParagraphs(doc, table, cell, lines) {
  const paragraphCount = doc.getCellParagraphCount(table.section, table.parentParagraph, table.control, cell);
  const lastPara = Math.max(0, paragraphCount - 1);
  const lastLength = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, lastPara);
  try {
    parseJsonResult(
      doc.deleteRangeInCell(table.section, table.parentParagraph, table.control, cell, 0, 0, lastPara, lastLength),
      "deleteRangeInCell"
    );
  } catch {
    for (let para = paragraphCount - 1; para >= 0; para -= 1) {
      const length = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, para);
      if (length > 0) {
        parseJsonResult(
          doc.deleteTextInCell(table.section, table.parentParagraph, table.control, cell, para, 0, length),
          "deleteTextInCell"
        );
      }
    }
  }

  parseJsonResult(
    doc.insertTextInCell(table.section, table.parentParagraph, table.control, cell, 0, 0, lines[0]),
    "insertTextInCell"
  );

  for (let i = 1; i < lines.length; i += 1) {
    const prevPara = i - 1;
    const prevLength = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, prevPara);
    const split = parseJsonResult(
      doc.splitParagraphInCell(table.section, table.parentParagraph, table.control, cell, prevPara, prevLength),
      "splitParagraphInCell"
    );
    const paraIndex = Number(split.cellParaIndex ?? i);
    parseJsonResult(
      doc.insertTextInCell(table.section, table.parentParagraph, table.control, cell, paraIndex, 0, lines[i]),
      "insertTextInCell"
    );
  }
}

function formatCell(doc, table, cell, lines, emphasisMap = {}, fontFamily = "?대㉫紐낆“") {
  const profile = getCellFitProfile(lines.length);
  const emphasis = getCellEmphasis(emphasisMap, cell, lines.length);
  const baseProps = {
    fontFamily,
    fontSize: cell === 1 || cell === 3 ? 1100 : profile.fontSize,
    bold: false,
    italic: false,
    underline: false,
    textColor: "#000000"
  };
  const headlineProps = {
    ...baseProps,
    bold: true
  };
  const emphasisProps = {
    fontFamily,
    fontSize: emphasis.fontSize ?? profile.fontSize,
    bold: emphasis.bold ?? true,
    italic: false,
    underline: false,
    textColor: emphasis.color ?? "#0000ff"
  };

  for (let para = 0; para < lines.length; para += 1) {
    const length = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, para);
    if (length <= 0) continue;
    const isEmphasis = emphasis.enabled && para === emphasis.lineIndex;
    const isHeadline = isBracketHeadline(lines[para]);
    parseJsonResult(
      doc.applyCharFormatInCell(
        table.section,
        table.parentParagraph,
        table.control,
        cell,
        para,
        0,
        length,
        JSON.stringify(isEmphasis ? emphasisProps : isHeadline ? headlineProps : baseProps)
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
          JSON.stringify({ align: isEmphasis ? emphasis.align : "left", lineSpacing: profile.lineSpacing })
        ),
        "applyParaFormatInCell"
      );
    } catch {
      // Character formatting is the required part; paragraph keys vary by build.
    }
  }
}

function isBracketHeadline(line) {
  return /^\s*\[[^\]]+\]\s*$/.test(String(line ?? ""));
}

function getCellEmphasis(emphasisMap, cell, lineCount) {
  const raw = emphasisMap?.[String(cell)] ?? (cell === 11 ? { line: -1, color: "#0000ff", align: "center" } : null);
  if (!raw) return { enabled: false };
  const line = Number(raw.line ?? -1);
  const lineIndex = line < 0 ? lineCount + line : line;
  return {
    enabled: lineIndex >= 0 && lineIndex < lineCount,
    lineIndex,
    color: raw.color ?? "#0000ff",
    align: raw.align ?? "center",
    fontSize: raw.fontSize,
    bold: raw.bold
  };
}

function getCellFitProfile(lineCount) {
  if (lineCount >= 10) return { fontSize: 780, lineSpacing: 112 };
  if (lineCount >= 9) return { fontSize: 840, lineSpacing: 118 };
  if (lineCount >= 7) return { fontSize: 920, lineSpacing: 124 };
  if (lineCount >= 5) return { fontSize: 1000, lineSpacing: 132 };
  return { fontSize: 1100, lineSpacing: 140 };
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
  const wasmPath = path.join(installDir, "node_modules", "@rhwp", "core", "rhwp_bg.wasm");
  await core.default({ module_or_path: await readFile(wasmPath) });
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

function hancomResave(inputPath, outputPath) {
  const script = `
$ErrorActionPreference = 'Stop'
$inputPath = ${quotePowerShellString(path.resolve(inputPath))}
$outputPath = ${quotePowerShellString(path.resolve(outputPath))}
${hancomRequireNoExistingHwpPowerShell()}
$hwp = New-Object -ComObject HWPFrame.HwpObject
$hwp.SetMessageBoxMode(0x00020000) | Out-Null
${hancomSecurityPowerShell(import.meta.url)}
$opened = $hwp.Open($inputPath, 'HWP', 'forceopen:true;readonly:false')
if (-not $opened) { throw 'Hancom HWP failed to open layout output.' }
$hwp.SaveAs($outputPath, 'HWP', '') | Out-Null
$hwp.Quit()
Write-Output (@{ ok = $true; method = 'hancom-com-resave'; outputPath = $outputPath } | ConvertTo-Json -Compress)
`;

  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Hancom re-save failed: ${stderr || error.message}`));
        return;
      }
      const trimmed = stdout.trim();
      try {
        resolve(trimmed ? JSON.parse(trimmed) : null);
      } catch {
        resolve(trimmed);
      }
    });
  });
}

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function readLayoutReplacements(mapPath) {
  return readLayoutReplacementsFromMap(await readLayoutMap(mapPath));
}

async function readLayoutMap(mapPath) {
  return JSON.parse((await readFile(mapPath, "utf8")).replace(/^\uFEFF/, ""));
}

function readLayoutReplacementsFromMap(map) {
  const replacements = map.layoutReplacements || map.replacements;
  if (!Array.isArray(replacements) || replacements.length === 0) {
    throw new Error("--layout-map requires layoutReplacements or replacements array");
  }

  return replacements.map((item, index) => {
    const find = String(item.find ?? "");
    const replaceValue = item.replace ?? item.lines;
    const replace = Array.isArray(replaceValue) ? replaceValue.join("\r\n") : String(replaceValue ?? "");
    if (!find || replaceValue === undefined) {
      throw new Error(`Invalid layout replacement at index ${index}`);
    }
    return { find, replace };
  });
}

async function layoutCellsWithRhwp(inputPath, outputPath, map) {
  const core = await loadRhwpCore();
  const doc = new core.HwpDocument(new Uint8Array(await readFile(inputPath)));
  let table = {
    section: Number(map.section ?? 0),
    parentParagraph: Number(map.parentParagraph),
    control: Number(map.control ?? 0)
  };

  if (!Number.isInteger(table.parentParagraph)) {
    throw new Error("layout-map with cells requires integer parentParagraph");
  }
  table = resolveTable(doc, table, map.cells ?? {});
  if (!isUsableTable(doc, table, map.cells ?? {})) {
    throw new Error("No usable overview table found. Inspect the file or use an overview-table template.");
  }

  let paragraphsWritten = 0;
  try {
    for (const [cellKey, value] of Object.entries(map.cells ?? {})) {
      const cell = Number(cellKey);
      if (!Number.isInteger(cell)) throw new Error(`Cell key must be an integer: ${cellKey}`);
      const rawLines = Array.isArray(value)
        ? value
        : String(typeof value === "object" && value !== null ? value.text ?? "" : value).split(/\r?\n/);
      const lines = normalizeCellLines(cell, rawLines);
      if (!lines.length) continue;
      overwriteCellParagraphs(doc, table, cell, lines);
      paragraphsWritten += lines.length;
      formatCell(doc, table, cell, lines, map.emphasis ?? {}, map.fontFamily);
    }

    const rawOutput = process.platform === "win32" ? path.join(os.tmpdir(), `hwp-layout-${Date.now()}.hwp`) : outputPath;
    await writeFile(rawOutput, Buffer.from(doc.exportHwp()));
    const normalized = process.platform === "win32" ? await hancomResave(rawOutput, outputPath) : null;
    return { ok: true, method: "rhwp-cell-paragraph-layout", outputPath, paragraphsWritten, normalized };
  } finally {
    doc.free();
  }
}

function resolveTable(doc, table, cells) {
  if (isUsableTable(doc, table, cells)) return table;
  const section = Number(table.section ?? 0);
  for (let parentParagraph = 0; parentParagraph < 80; parentParagraph += 1) {
    for (let control = 0; control < 12; control += 1) {
      const candidate = { section, parentParagraph, control };
      if (isUsableTable(doc, candidate, cells)) return candidate;
    }
  }
  return table;
}

function isUsableTable(doc, table, cells) {
  try {
    const targetCells = Object.keys(cells).map(Number).filter(Number.isInteger);
    const probeCells = targetCells.length ? targetCells.slice(0, 3) : [1, 3, 5];
    for (const cell of probeCells) {
      doc.getCellParagraphCount(table.section, table.parentParagraph, table.control, cell);
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeCellLines(cell, rawLines) {
  const lines = rawLines.map((line) => String(line).trimEnd()).filter((line) => line.trim().length > 0);
  if (cell !== 3) return lines;
  return [compactCategoryLabel(lines.join(" "))].filter(Boolean);
}

function compactCategoryLabel(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const firstChunk = normalized.split(/[\/|,쨌??/)[0]?.trim() || normalized;
  return firstChunk.replace(/\s*?곹뭹$/u, "").trim();
}

function layoutWithHancomCom(inputPath, outputPath, customReplacements = null) {
  const replacements = customReplacements || [
    {
      find: "[ ?먮룞 ?뚯쟾?쇰줈 ?쒗뭹 援쎄린 ?덉쭏???쒖??뷀븯???낆냼???μ튂 ] - ?쒗뭹???쇱젙 ?띾룄濡??뚯쟾?쒖폒 ?욌뮘瑜?洹좎씪?섍쾶 議곕━ - 吏곸썝 ?ㅼ쭛湲??낅Т, 援쎄린 ?몄감, 湲곕쫫 ?먯쓣 ?숈떆??媛먯냼 - ?듭떖 湲곕뒫: ?뚯쟾 紐⑦꽣, ?먮즺 怨좎젙 ??? 湲곕쫫 諛곗텧 援ъ“ - 湲곕??④낵: ?몃젰 遺??媛먯냼, ?뚯씠釉??뚯쟾??媛쒖꽑, 怨좉컼 遺덈쭔 媛먯냼",
      replace: [
        "[ ?먮룞 ?뚯쟾?쇰줈 ?쒗뭹 援쎄린 ?덉쭏???쒖??뷀븯???낆냼???μ튂 ]",
        "- ?쒗뭹???쇱젙 ?띾룄濡??뚯쟾?쒖폒 ?욌뮘瑜?洹좎씪?섍쾶 議곕━",
        "- 吏곸썝 ?ㅼ쭛湲??낅Т, 援쎄린 ?몄감, 湲곕쫫 ?먯쓣 ?숈떆??媛먯냼",
        "- ?듭떖 湲곕뒫: ?뚯쟾 紐⑦꽣, ?먮즺 怨좎젙 ??? 湲곕쫫 諛곗텧 援ъ“",
        "- 湲곕??④낵: ?몃젰 遺??媛먯냼, ?뚯씠釉??뚯쟾??媛쒖꽑, 怨좉컼 遺덈쭔 媛먯냼"
      ].join("\r\n")
    },
    {
      find: "[ 怨좉퉫吏?援쎄린 ?덉쭏??吏곸썝 ?숇젴?꾩? ?쇳겕????곹솴??醫뚯슦??] - 援쎄린, 遺덊뙋 愿由? ?쒕튃??寃뱀퀜 議곕━ ?덉쭏 ?몄감 諛쒖깮 - 怨좉컼 吏곸젒 議곕━ ????, ???듭쓬, ?곌린쨌湲곕쫫 ??遺덈쭔 諛섎났 - 臾댄븳由ы븘쨌?⑥껜 留ㅼ옣? 援쎄린 愿由?遺?댁씠 ?뱁엳 ??- ?먮룞 ?뚯쟾 援ъ“濡?議곕━ ?덉쭏怨??묒뾽 ?⑥쑉???④퍡 媛쒖꽑",
      replace: [
        "[ 怨좉퉫吏?援쎄린 ?덉쭏??吏곸썝 ?숇젴?꾩? ?쇳겕????곹솴??醫뚯슦??]",
        "- 援쎄린, 遺덊뙋 愿由? ?쒕튃??寃뱀퀜 議곕━ ?덉쭏 ?몄감 諛쒖깮",
        "- 怨좉컼 吏곸젒 議곕━ ????, ???듭쓬, ?곌린쨌湲곕쫫 ??遺덈쭔 諛섎났",
        "- 臾댄븳由ы븘쨌?⑥껜 留ㅼ옣? 援쎄린 愿由?遺?댁씠 ?뱁엳 ??,
        "- ?먮룞 ?뚯쟾 援ъ“濡?議곕━ ?덉쭏怨??묒뾽 ?⑥쑉???④퍡 媛쒖꽑"
      ].join("\r\n")
    },
    {
      find: "[ ?뚯쟾 議곕━ 援ъ“瑜??곸슜???쒖젣???쒖옉 諛??꾩옣 ?뚯뒪??異붿쭊 ] - 紐⑦꽣, 怨좎젙 ??? ?댁썝 媛꾧꺽, 湲곕쫫 諛곗텧 援ъ“瑜?寃고빀 - ?뚯씠釉뷀삎쨌二쇰갑??2媛吏 紐⑤뜽濡?留ㅼ옣 ?댁쁺 諛⑹떇蹂?寃利?- ?뚯뒪??留ㅼ옣 3~5怨녹뿉??議곕━ ?쒓컙, ?숈꽑, 怨좉컼 諛섏쓳 痢≪젙 - ?덉쟾?? ?몄쿃?? ?닿뎄???쇰뱶諛?諛섏쁺 ???묒궛 援ъ“ 媛쒖꽑",
      replace: [
        "[ ?뚯쟾 議곕━ 援ъ“瑜??곸슜???쒖젣???쒖옉 諛??꾩옣 ?뚯뒪??異붿쭊 ]",
        "- 紐⑦꽣, 怨좎젙 ??? ?댁썝 媛꾧꺽, 湲곕쫫 諛곗텧 援ъ“瑜?寃고빀",
        "- ?뚯씠釉뷀삎쨌二쇰갑??2媛吏 紐⑤뜽濡?留ㅼ옣 ?댁쁺 諛⑹떇蹂?寃利?,
        "- ?뚯뒪??留ㅼ옣 3~5怨녹뿉??議곕━ ?쒓컙, ?숈꽑, 怨좉컼 諛섏쓳 痢≪젙",
        "- ?덉쟾?? ?몄쿃?? ?닿뎄???쇰뱶諛?諛섏쁺 ???묒궛 援ъ“ 媛쒖꽑"
      ].join("\r\n")
    },
    {
      find: "[ ?쒗뭹 ?꾨Ц???쒖옣 吏꾩엯 ???뚰깉쨌?좎?蹂댁닔 紐⑤뜽濡??뺤옣 ] - 2026?? ?쒖젣???꾩꽦, ?뚯뒪??留ㅼ옣 ?뺣낫, ?꾩옣 寃利??곗씠???뺣낫 - 2027?? ?쒗뭹 ?꾨Ц?먃룸Т?쒕━??留ㅼ옣 ????먮ℓ/?뚰깉 ?쒖옉 - 2028?? ?꾨옖李⑥씠利??쒗쑕, ?좎?蹂댁닔 怨꾩빟, ?뚮え??留ㅼ텧 ?뺣? - ?κ린?곸쑝濡??먮즺 醫낅쪟蹂?紐⑤뱢??異붽???援ъ씠 ?먮룞???쇱씤??援ъ텞",
      replace: [
        "[ ?쒗뭹 ?꾨Ц???쒖옣 吏꾩엯 ???뚰깉쨌?좎?蹂댁닔 紐⑤뜽濡??뺤옣 ]",
        "- 2026?? ?쒖젣???꾩꽦, ?뚯뒪??留ㅼ옣 ?뺣낫, ?꾩옣 寃利??곗씠???뺣낫",
        "- 2027?? ?쒗뭹 ?꾨Ц?먃룸Т?쒕━??留ㅼ옣 ????먮ℓ/?뚰깉 ?쒖옉",
        "- 2028?? ?꾨옖李⑥씠利??쒗쑕, ?좎?蹂댁닔 怨꾩빟, ?뚮え??留ㅼ텧 ?뺣?",
        "- ?κ린?곸쑝濡??먮즺 醫낅쪟蹂?紐⑤뱢??異붽???援ъ씠 ?먮룞???쇱씤??援ъ텞",
        "          2030?꾧퉴吏 ?곕ℓ異?30?듭썝 ?ъ꽦 紐⑺몴"
      ].join("\r\n")
    },
    {
      find: "[ ?꾩옣 臾몄젣 ?뺤쓽, 湲곌뎄 ?ㅺ퀎, ?쒖뼱 媛쒕컻, 留ㅼ옣 寃利?以묒떖???ㅽ뻾 泥닿퀎 ] - ??쒖옄: 怨좉컼 臾몄젣 ?뺤쓽, ?쒗뭹 湲고쉷, ?ъ뾽???꾨왂 珥앷큵 - 湲곌뎄 ?묐젰?? ?뚯쟾 援ъ“, ?먮즺 怨좎젙 ?μ튂, 湲곕쫫 諛곗텧遺 ?ㅺ퀎 - ?꾧린쨌?쒖뼱 ?묐젰?? 紐⑦꽣 ?쒖뼱, ?띾룄 ?덉젙?? ?덉쟾 ?μ튂 媛쒕컻 - ?뚯뒪??留ㅼ옣: 議곕━ ?덉쭏, ?묒뾽 ?⑥쑉, 怨좉컼 諛섏쓳 ?곗씠???쒓났",
      replace: [
        "[ ?꾩옣 臾몄젣 ?뺤쓽, 湲곌뎄 ?ㅺ퀎, ?쒖뼱 媛쒕컻, 留ㅼ옣 寃利?以묒떖???ㅽ뻾 泥닿퀎 ]",
        "- ??쒖옄: 怨좉컼 臾몄젣 ?뺤쓽, ?쒗뭹 湲고쉷, ?ъ뾽???꾨왂 珥앷큵",
        "- 湲곌뎄 ?묐젰?? ?뚯쟾 援ъ“, ?먮즺 怨좎젙 ?μ튂, 湲곕쫫 諛곗텧遺 ?ㅺ퀎",
        "- ?꾧린쨌?쒖뼱 ?묐젰?? 紐⑦꽣 ?쒖뼱, ?띾룄 ?덉젙?? ?덉쟾 ?μ튂 媛쒕컻",
        "- ?뚯뒪??留ㅼ옣: 議곕━ ?덉쭏, ?묒뾽 ?⑥쑉, 怨좉컼 諛섏쓳 ?곗씠???쒓났"
      ].join("\r\n")
    }
  ];
  const replacementsJson = Buffer.from(JSON.stringify(replacements), "utf8").toString("base64");
  const script = `
$ErrorActionPreference = 'Stop'
$inputPath = ${quotePowerShellString(path.resolve(inputPath))}
$outputPath = ${quotePowerShellString(path.resolve(outputPath))}
$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${replacementsJson}'))
$pairs = $json | ConvertFrom-Json
${hancomRequireNoExistingHwpPowerShell()}
$hwp = New-Object -ComObject HWPFrame.HwpObject
$hwp.SetMessageBoxMode(0x00020000) | Out-Null
${hancomSecurityPowerShell(import.meta.url)}
$opened = $hwp.Open($inputPath, 'HWP', 'forceopen:true;readonly:false')
if (-not $opened) { throw 'Hancom HWP failed to open input file.' }

function Invoke-AllReplace([string]$find, [string]$replace) {
  $act = $hwp.CreateAction('AllReplace')
  $set = $act.CreateSet()
  $act.GetDefault($set) | Out-Null
  $set.SetItem('FindString', $find) | Out-Null
  $set.SetItem('ReplaceString', $replace) | Out-Null
  $set.SetItem('Direction', 2) | Out-Null
  $set.SetItem('IgnoreMessage', 1) | Out-Null
  $set.SetItem('FindType', 1) | Out-Null
  try {
    return [bool]$act.Execute($set)
  } catch {
    return $false
  }
}

function Get-OverviewFitProfile([int]$lineCount) {
  if ($lineCount -ge 10) { return @{ Height = 780; LineSpacing = 78; TopSpacing = 35 } }
  if ($lineCount -ge 9) { return @{ Height = 840; LineSpacing = 82; TopSpacing = 40 } }
  if ($lineCount -ge 7) { return @{ Height = 920; LineSpacing = 86; TopSpacing = 45 } }
  if ($lineCount -ge 5) { return @{ Height = 1000; LineSpacing = 90; TopSpacing = 50 } }
  return @{ Height = 1100; LineSpacing = 96; TopSpacing = 55 }
}

function Apply-OverviewTextStyle([string]$text, [int]$height, [int]$lineSpacing, [int]$prevSpacing) {
  if ([string]::IsNullOrWhiteSpace($text)) { return $false }
  try { $hwp.SetPos(0, 0, 0) | Out-Null } catch {}
  $act = $hwp.CreateAction('RepeatFind')
  $set = $act.CreateSet()
  $act.GetDefault($set) | Out-Null
  $set.SetItem('FindString', $text) | Out-Null
  $set.SetItem('Direction', 2) | Out-Null
  $set.SetItem('IgnoreMessage', 1) | Out-Null
  $set.SetItem('FindType', 1) | Out-Null
  try {
    if (-not $act.Execute($set)) { return $false }
    $charAct = $hwp.CreateAction('CharShape')
    $charSet = $charAct.CreateSet()
    $charAct.GetDefault($charSet) | Out-Null
    $charSet.SetItem('TextColor', 0) | Out-Null
    $charSet.SetItem('Italic', 0) | Out-Null
    $charSet.SetItem('Bold', 0) | Out-Null
    $charSet.SetItem('Height', $height) | Out-Null
    foreach ($spacingKey in @('SpacingHangul', 'SpacingLatin', 'SpacingHanja', 'SpacingJapanese', 'SpacingOther', 'SpacingSymbol', 'SpacingUser')) {
      try { $charSet.SetItem($spacingKey, 0) | Out-Null } catch {}
    }
    foreach ($ratioKey in @('RatioHangul', 'RatioLatin', 'RatioHanja', 'RatioJapanese', 'RatioOther', 'RatioSymbol', 'RatioUser')) {
      try { $charSet.SetItem($ratioKey, 100) | Out-Null } catch {}
    }
    $charAct.Execute($charSet) | Out-Null
    foreach ($paraActionName in @('ParagraphShape', 'ParaShape')) {
      try {
        $paraAct = $hwp.CreateAction($paraActionName)
        $paraSet = $paraAct.CreateSet()
        $paraAct.GetDefault($paraSet) | Out-Null
        $paraSet.SetItem('AlignType', 0) | Out-Null
        $paraSet.SetItem('LineSpacing', $lineSpacing) | Out-Null
        $paraSet.SetItem('PrevSpacing', $prevSpacing) | Out-Null
        $paraSet.SetItem('NextSpacing', 0) | Out-Null
        $paraAct.Execute($paraSet) | Out-Null
      } catch {}
    }
    return $true
  } catch {
    return $false
  }
}

$attempted = 0
$reportedSuccess = 0
$styled = 0
foreach ($pair in $pairs) {
  $attempted += 1
  if (Invoke-AllReplace $pair.find $pair.replace) { $reportedSuccess += 1 }
  $lines = @([string]$pair.replace -split "\\r?\\n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  $profile = Get-OverviewFitProfile $lines.Count
  for ($lineIndex = 0; $lineIndex -lt $lines.Count; $lineIndex += 1) {
    $line = $lines[$lineIndex]
    $prevSpacing = if ($lineIndex -eq 0) { $profile.TopSpacing } else { 0 }
    if (Apply-OverviewTextStyle $line $profile.Height $profile.LineSpacing $prevSpacing) { $styled += 1 }
  }
}

$hwp.SaveAs($outputPath, 'HWP', '') | Out-Null
$hwp.Quit()
Write-Output (@{
  ok = $true
  method = 'hancom-com-layout'
  outputPath = $outputPath
  attempted = $attempted
  reportedSuccess = $reportedSuccess
  styled = $styled
} | ConvertTo-Json -Compress)
`;

  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Hancom COM layout failed: ${stderr || error.message}`));
        return;
      }
      const trimmed = stdout.trim();
      try {
        resolve(trimmed ? JSON.parse(trimmed) : { ok: true, method: "hancom-com-layout" });
      } catch {
        resolve({ ok: true, method: "hancom-com-layout", raw: trimmed });
      }
    });
  });
}
