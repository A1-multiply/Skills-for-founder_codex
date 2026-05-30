#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const require = createRequire(import.meta.url);
const CFB = loadCfb();

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  npx --yes --package cfb node hwp_clean_text.mjs <input.hwp> <output.hwp> --text <text> [--text <text> ...]
  npx --yes --package cfb node hwp_clean_text.mjs <input.hwp> <output.hwp> --preset business-plan-guides

Purpose:
  Removes visible guide/example text inside HWP body streams by replacing exact text with spaces.
  This is useful when table-cell filling leaves nested blue guide text behind.
`);
}

function collectFlags(name) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
      values.push(value);
      i += 1;
    }
  }
  return values;
}

const input = args[0];
const output = args[1];

if (!input || !output || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(input || output ? 0 : 1);
}

const preset = collectFlags("--preset");
const texts = collectFlags("--text");

if (preset.includes("business-plan-guides")) {
  texts.push(
    "???덉떆 1 : 寃뚰넗?덉씠",
    "?덉떆 2 : Windows",
    "?덉떆 3 : ?뚰뙆怨?,
    "???덉떆 1 : ?ㅽ룷痢좎쓬猷?,
    "?덉떆 2 : OS(?댁쁺泥닿퀎)",
    "?덉떆 3 : ?멸났吏?ν봽濡쒓렇??,
    "??蹂?吏?먯궗?낆쓣 ?듯빐 媛쒕컻 ?먮뒗 援ъ껜?뷀븯怨좎옄 ?섎뒗 ?쒗뭹쨌?쒕퉬??媛쒖슂",
    "(?ъ슜 ?⑸룄, ?ъ뼇, 媛寃???, ?듭떖 湲곕뒫쨌?깅뒫, 怨좉컼 ?쒓났 ?쒗깮 ??,
    "???덉떆 : 媛踰쇱?(怨좉컼 ?쒓났 ?쒗깮)???꾪빐???⑸웾??以꾩씠???щ즺(?듭떖 湲곕뒫)瑜??ъ슜",
    "??媛쒕컻?섍퀬???섎뒗 李쎌뾽 ?꾩씠?쒖쓽 援?궡쨌???쒖옣 ?꾪솴 諛?臾몄젣????,
    "臾몄젣 ?닿껐???꾪븳 李쎌뾽 ?꾩씠???꾩슂????,
    "??媛쒕컻?섍퀬???섎뒗 李쎌뾽 ?꾩씠?쒖쓣 ?ъ뾽湲곌컙 ???쒗뭹쨌?쒕퉬?ㅻ줈 媛쒕컻 ?먮뒗 援ъ껜??,
    "?섍퀬???섎뒗 怨꾪쉷(理쒖쥌 ?곗텧臾??뺥깭, ?섎웾 ??",
    "- 媛쒕컻?섍퀬???섎뒗 李쎌뾽 ?꾩씠?쒖쓽 李⑤퀎??諛?寃쎌웳???뺣낫 ?꾨왂",
    "??寃쎌웳??遺꾩꽍, 紐⑺몴 ?쒖옣 吏꾩엯 ?꾨왂, 李쎌뾽 ?꾩씠?쒖쓽 鍮꾩쫰?덉뒪 紐⑤뜽(?섏씡??紐⑤뜽),",
    "?ъ뾽 ?꾩껜 濡쒕뱶留? ?ъ옄?좎튂 ?꾨왂 ??,
    "????쒖옄, ??? ?낅Т?뚰듃???묐젰湲곗뾽) ????웾 ?쒖슜 怨꾪쉷 ??
  );
}

if (texts.length === 0) {
  throw new Error("Provide at least one --text value or --preset business-plan-guides");
}

const source = await readFile(input);
const cfb = CFB.read(source, { type: "buffer" });
let replacements = 0;

for (const entry of cfb.FileIndex) {
  if (!entry.name || !entry.content) continue;
  if (!/^Section\d+$/i.test(entry.name) && !/BodyText[\\/]+Section\d+$/i.test(entry.name)) continue;

  const content = Buffer.from(entry.content);
  const inflated = inflateBody(content);
  if (!inflated) continue;

  let changed = inflated.buffer;
  let streamReplacements = 0;
  for (const text of texts) {
    const result = blankUtf16Text(changed, text);
    changed = result.buffer;
    replacements += result.count;
    streamReplacements += result.count;
  }

  if (streamReplacements > 0) {
    entry.content = zlib.deflateRawSync(changed);
  }
}

await writeFile(output, CFB.write(cfb, { type: "buffer" }));
console.log(JSON.stringify({ ok: true, outputPath: output, replacements }, null, 2));

function inflateBody(buffer) {
  try {
    return { buffer: zlib.inflateRawSync(buffer), compressed: true };
  } catch {
    return { buffer, compressed: false };
  }
}

function blankUtf16Text(buffer, text) {
  const needle = Buffer.from(text, "utf16le");
  const replacement = Buffer.from(" ".repeat([...text].length), "utf16le");
  let searchFrom = 0;
  let count = 0;
  let current = Buffer.from(buffer);

  while (true) {
    const index = current.indexOf(needle, searchFrom);
    if (index === -1) break;
    replacement.copy(current, index);
    searchFrom = index + replacement.length;
    count += 1;
  }

  return { buffer: current, count };
}

function loadCfb() {
  try {
    return require("cfb");
  } catch {
    const installDir = path.join(os.tmpdir(), "A1-HWP-SKILL-node-deps");
    mkdirSync(installDir, { recursive: true });
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    if (process.platform === "win32") {
      execSync(`${npm} install cfb@^1.2.2 --no-audit --no-fund`, { cwd: installDir, stdio: "ignore" });
    } else {
      execFileSync(npm, ["install", "cfb@^1.2.2", "--no-audit", "--no-fund"], {
        cwd: installDir,
        stdio: "ignore"
      });
    }
    return createRequire(path.join(installDir, "package.json"))("cfb");
  }
}
