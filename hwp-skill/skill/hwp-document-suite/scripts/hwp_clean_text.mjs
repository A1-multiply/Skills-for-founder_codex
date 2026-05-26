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
    "※ 예시 1 : 게토레이",
    "예시 2 : Windows",
    "예시 3 : 알파고",
    "※ 예시 1 : 스포츠음료",
    "예시 2 : OS(운영체계)",
    "예시 3 : 인공지능프로그램",
    "※ 본 지원사업을 통해 개발 또는 구체화하고자 하는 제품·서비스 개요",
    "(사용 용도, 사양, 가격 등), 핵심 기능·성능, 고객 제공 혜택 등",
    "※ 예시 : 가벼움(고객 제공 혜택)을 위해서 용량을 줄이는 재료(핵심 기능)를 사용",
    "※ 개발하고자 하는 창업 아이템의 국내·외 시장 현황 및 문제점 등",
    "문제 해결을 위한 창업 아이템 필요성 등",
    "※ 개발하고자 하는 창업 아이템을 사업기간 내 제품·서비스로 개발 또는 구체화",
    "하고자 하는 계획(최종 산출물_형태, 수량 등)",
    "- 개발하고자 하는 창업 아이템의 차별성 및 경쟁력 확보 전략",
    "※ 경쟁사 분석, 목표 시장 진입 전략, 창업 아이템의 비즈니스 모델(수익화 모델),",
    "사업 전체 로드맵, 투자유치 전략 등",
    "※ 대표자, 팀원, 업무파트너(협력기업) 등 역량 활용 계획 등"
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
    const installDir = path.join(os.tmpdir(), "hwp-document-suite-node-deps");
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
