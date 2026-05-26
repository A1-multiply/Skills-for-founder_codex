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

if (process.platform === "win32") {
  const result = await layoutWithHancomCom(input, output, layoutMapPath ? await readLayoutReplacements(layoutMapPath) : null);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const core = await loadRhwpCore();
const doc = new core.HwpDocument(new Uint8Array(await readFile(input)));

try {
  const table = { section: 0, parentParagraph: 7, control: 0 };
  const cells = {
    1: ["삼겹살 무한회전 그릴 시스템"],
    3: ["음식점 주방 자동화 / 고기구이 조리장비"],
    5: [
      "[ 자동 회전으로 삼겹살 굽기 품질을 표준화하는 업소용 그릴 ]",
      "- 삼겹살을 일정 속도로 회전시켜 앞뒤를 균일하게 조리",
      "- 직원 뒤집기 업무, 굽기 편차, 기름 튐을 동시에 감소",
      "- 핵심 기능: 회전 모터, 고기 고정 홀더, 기름 배출 구조",
      "- 기대효과: 인력 부담 감소, 테이블 회전율 개선, 고객 불만 감소"
    ],
    7: [
      "[ 고깃집 굽기 품질이 직원 숙련도와 피크타임 상황에 좌우됨 ]",
      "- 굽기, 불판 관리, 서빙이 겹쳐 조리 품질 편차 발생",
      "- 고객 직접 조리 시 태움, 덜 익음, 연기·기름 튐 불만 반복",
      "- 무한리필·단체 매장은 굽기 관리 부담이 특히 큼",
      "- 자동 회전 구조로 조리 품질과 작업 효율을 함께 개선"
    ],
    9: [
      "[ 회전 조리 구조를 적용한 시제품 제작 및 현장 테스트 추진 ]",
      "- 모터, 고정 홀더, 열원 간격, 기름 배출 구조를 결합",
      "- 테이블형·주방형 2가지 모델로 운영 방식별 검증",
      "- 테스트 매장 3~5곳에서 조리 시간, 동선, 고객 반응 측정",
      "- 안전성, 세척성, 내구성 피드백 반영 후 양산 구조 개선"
    ],
    11: [
      "[ 삼겹살 전문점 시장 진입 후 렌탈·유지보수 모델로 확장 ]",
      "- 2026년: 시제품 완성, 테스트 매장 확보, 현장 검증 데이터 확보",
      "- 2027년: 삼겹살 전문점·무한리필 매장 대상 판매/렌탈 시작",
      "- 2028년: 프랜차이즈 제휴, 유지보수 계약, 소모품 매출 확대",
      "- 장기적으로 고기 종류별 모듈을 추가해 구이 자동화 라인업 구축",
      "　　　　　　　2030년까지 연매출 30억원 달성 목표"
    ],
    13: [
      "[ 현장 문제 정의, 기구 설계, 제어 개발, 매장 검증 중심의 실행 체계 ]",
      "- 대표자: 고객 문제 정의, 제품 기획, 사업화 전략 총괄",
      "- 기구 협력사: 회전 구조, 고기 고정 장치, 기름 배출부 설계",
      "- 전기·제어 협력사: 모터 제어, 속도 안정화, 안전 장치 개발",
      "- 테스트 매장: 조리 품질, 작업 효율, 고객 반응 데이터 제공"
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

function formatCell(doc, table, cell, lines) {
  const baseProps = {
    fontFamily: "휴먼명조",
    fontSize: cell === 1 || cell === 3 ? 950 : 850,
    bold: false,
    italic: false,
    underline: false,
    textColor: "#000000"
  };
  const emphasisProps = {
    fontFamily: "휴먼명조",
    fontSize: 1050,
    bold: true,
    italic: false,
    underline: false,
    textColor: "#0000ff"
  };

  for (let para = 0; para < lines.length; para += 1) {
    const length = doc.getCellParagraphLength(table.section, table.parentParagraph, table.control, cell, para);
    if (length <= 0) continue;
    const isEmphasis = cell === 11 && para === lines.length - 1;
    parseJsonResult(
      doc.applyCharFormatInCell(
        table.section,
        table.parentParagraph,
        table.control,
        cell,
        para,
        0,
        length,
        JSON.stringify(isEmphasis ? emphasisProps : baseProps)
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
          JSON.stringify({ align: isEmphasis ? "center" : "left", lineSpacing: 120 })
        ),
        "applyParaFormatInCell"
      );
    } catch {
      // Character formatting is the required part; paragraph keys vary by build.
    }
  }
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
  const map = JSON.parse(await readFile(mapPath, "utf8"));
  const replacements = map.layoutReplacements || map.replacements;
  if (!Array.isArray(replacements) || replacements.length === 0) {
    throw new Error("--layout-map requires layoutReplacements or replacements array");
  }

  return replacements.map((item, index) => {
    const find = String(item.find ?? "");
    const replaceValue = item.replace ?? item.lines;
    const replace = Array.isArray(replaceValue) ? replaceValue.join("\r\n") : String(replaceValue ?? "");
    if (!find || !replace) {
      throw new Error(`Invalid layout replacement at index ${index}`);
    }
    return { find, replace };
  });
}

function layoutWithHancomCom(inputPath, outputPath, customReplacements = null) {
  const replacements = customReplacements || [
    {
      find: "[ 자동 회전으로 삼겹살 굽기 품질을 표준화하는 업소용 그릴 ] - 삼겹살을 일정 속도로 회전시켜 앞뒤를 균일하게 조리 - 직원 뒤집기 업무, 굽기 편차, 기름 튐을 동시에 감소 - 핵심 기능: 회전 모터, 고기 고정 홀더, 기름 배출 구조 - 기대효과: 인력 부담 감소, 테이블 회전율 개선, 고객 불만 감소",
      replace: [
        "[ 자동 회전으로 삼겹살 굽기 품질을 표준화하는 업소용 그릴 ]",
        "- 삼겹살을 일정 속도로 회전시켜 앞뒤를 균일하게 조리",
        "- 직원 뒤집기 업무, 굽기 편차, 기름 튐을 동시에 감소",
        "- 핵심 기능: 회전 모터, 고기 고정 홀더, 기름 배출 구조",
        "- 기대효과: 인력 부담 감소, 테이블 회전율 개선, 고객 불만 감소"
      ].join("\r\n")
    },
    {
      find: "[ 고깃집 굽기 품질이 직원 숙련도와 피크타임 상황에 좌우됨 ] - 굽기, 불판 관리, 서빙이 겹쳐 조리 품질 편차 발생 - 고객 직접 조리 시 타움, 덜 익음, 연기·기름 튐 불만 반복 - 무한리필·단체 매장은 굽기 관리 부담이 특히 큼 - 자동 회전 구조로 조리 품질과 작업 효율을 함께 개선",
      replace: [
        "[ 고깃집 굽기 품질이 직원 숙련도와 피크타임 상황에 좌우됨 ]",
        "- 굽기, 불판 관리, 서빙이 겹쳐 조리 품질 편차 발생",
        "- 고객 직접 조리 시 타움, 덜 익음, 연기·기름 튐 불만 반복",
        "- 무한리필·단체 매장은 굽기 관리 부담이 특히 큼",
        "- 자동 회전 구조로 조리 품질과 작업 효율을 함께 개선"
      ].join("\r\n")
    },
    {
      find: "[ 회전 조리 구조를 적용한 시제품 제작 및 현장 테스트 추진 ] - 모터, 고정 홀더, 열원 간격, 기름 배출 구조를 결합 - 테이블형·주방형 2가지 모델로 매장 운영 방식별 검증 - 테스트 매장 3~5곳에서 조리 시간, 동선, 고객 반응 측정 - 안전성, 세척성, 내구성 피드백 반영 후 양산 구조 개선",
      replace: [
        "[ 회전 조리 구조를 적용한 시제품 제작 및 현장 테스트 추진 ]",
        "- 모터, 고정 홀더, 열원 간격, 기름 배출 구조를 결합",
        "- 테이블형·주방형 2가지 모델로 매장 운영 방식별 검증",
        "- 테스트 매장 3~5곳에서 조리 시간, 동선, 고객 반응 측정",
        "- 안전성, 세척성, 내구성 피드백 반영 후 양산 구조 개선"
      ].join("\r\n")
    },
    {
      find: "[ 삼겹살 전문점 시장 진입 후 렌탈·유지보수 모델로 확장 ] - 2026년: 시제품 완성, 테스트 매장 확보, 현장 검증 데이터 확보 - 2027년: 삼겹살 전문점·무한리필 매장 대상 판매/렌탈 시작 - 2028년: 프랜차이즈 제휴, 유지보수 계약, 소모품 매출 확대 - 장기적으로 고기 종류별 모듈을 추가해 구이 자동화 라인업 구축",
      replace: [
        "[ 삼겹살 전문점 시장 진입 후 렌탈·유지보수 모델로 확장 ]",
        "- 2026년: 시제품 완성, 테스트 매장 확보, 현장 검증 데이터 확보",
        "- 2027년: 삼겹살 전문점·무한리필 매장 대상 판매/렌탈 시작",
        "- 2028년: 프랜차이즈 제휴, 유지보수 계약, 소모품 매출 확대",
        "- 장기적으로 고기 종류별 모듈을 추가해 구이 자동화 라인업 구축",
        "          2030년까지 연매출 30억원 달성 목표"
      ].join("\r\n")
    },
    {
      find: "[ 현장 문제 정의, 기구 설계, 제어 개발, 매장 검증 중심의 실행 체계 ] - 대표자: 고객 문제 정의, 제품 기획, 사업화 전략 총괄 - 기구 협력사: 회전 구조, 고기 고정 장치, 기름 배출부 설계 - 전기·제어 협력사: 모터 제어, 속도 안정화, 안전 장치 개발 - 테스트 매장: 조리 품질, 작업 효율, 고객 반응 데이터 제공",
      replace: [
        "[ 현장 문제 정의, 기구 설계, 제어 개발, 매장 검증 중심의 실행 체계 ]",
        "- 대표자: 고객 문제 정의, 제품 기획, 사업화 전략 총괄",
        "- 기구 협력사: 회전 구조, 고기 고정 장치, 기름 배출부 설계",
        "- 전기·제어 협력사: 모터 제어, 속도 안정화, 안전 장치 개발",
        "- 테스트 매장: 조리 품질, 작업 효율, 고객 반응 데이터 제공"
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

function Apply-OverviewTextStyle([string]$text) {
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
    $charSet.SetItem('Height', 850) | Out-Null
    $charAct.Execute($charSet) | Out-Null
    try {
      $paraAct = $hwp.CreateAction('ParagraphShape')
      $paraSet = $paraAct.CreateSet()
      $paraAct.GetDefault($paraSet) | Out-Null
      $paraSet.SetItem('AlignType', 0) | Out-Null
      $paraSet.SetItem('LineSpacing', 110) | Out-Null
      $paraAct.Execute($paraSet) | Out-Null
    } catch {}
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
  foreach ($line in ([string]$pair.replace -split "\\r?\\n")) {
    if (Apply-OverviewTextStyle $line) { $styled += 1 }
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
