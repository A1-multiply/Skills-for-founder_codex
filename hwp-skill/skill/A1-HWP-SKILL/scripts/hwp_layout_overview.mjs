#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  node hwp_layout_overview.mjs <input.hwp> <output.hwp> --preset pork-grill-overview
  node hwp_layout_overview.mjs <input.hwp> <output.hwp> --layout-map cells.json

Purpose:
  Applies the overview-table cell text/format map used by the startup-package templates.
  This wrapper delegates the heavy lifting to hwp_fill_cells.mjs.
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

const tempDir = await mkdtemp(path.join(tmpdir(), "hwp-layout-"));
try {
  const mapPath = layoutMapPath ? layoutMapPath : path.join(tempDir, "layout-map.json");
  if (!layoutMapPath) {
    const presetMap = {
      section: 0,
      parentParagraph: 7,
      control: 0,
      cleanPreset: "business-plan-guides",
      removeNestedGuidesPreset: "business-plan-overview",
      formatPreset: "business-plan-overview-compact",
      cells: {
        1: ["1조원짜리 선크림 100mg"],
        3: ["프리미엄 화장품"],
        5: [
          "[아이템 가치 제안]",
          "- 초고가 한정판 선케어로 상징성과 선물 가치를 강화",
          "- 소량 충진과 패키징 테스트로 시제품을 빠르게 검증",
          "- 프리미엄 원료와 브랜드 스토리로 차별화"
        ],
        7: [
          "[문제 인식]",
          "- 고가 선케어 시장은 대중형 제품과 차별 메시지가 약함",
          "- 프리미엄 고객은 성분, 패키지, 브랜드 상징성을 함께 원함",
          "- 소량 고가 제품의 시장 반응을 검증할 실험 구조가 필요함"
        ],
        9: [
          "[실현 가능성]",
          "- 소량 충진과 패키징 테스트로 시제품 검증 가능",
          "- 원료 조합과 용량을 낮춰 초기 제조 리스크를 줄임",
          "- 샘플 반응과 가격 수용성을 통해 출시 판단 가능"
        ],
        11: [
          "[성장전략]",
          "- VIP 선물, 기업 답례, 기념일 굿즈 채널부터 진입",
          "- 온라인 스토어와 프리미엄 편집숍으로 확장",
          "- 한정판 라인업으로 반복 구매와 브랜드 인지도를 확대"
        ],
        13: [
          "[프로젝트 수행을 위한 기획·제조·판매 검증 팀 구성]",
          "- 대표자: 제품 콘셉트, 시장 정의, 판매 채널을 총괄",
          "- 협력자: 원료, 제조, 품질 기준을 검증하는 실무 파트너",
          "- 유통 파트너: 초기 반응, 가격, 패키지 적합성을 점검"
        ]
      }
    };
    await writeFile(mapPath, JSON.stringify(presetMap, null, 2), "utf8");
  }

  const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "hwp_fill_cells.mjs");
  const result = await runNode(scriptPath, [input, output, "--map", mapPath]);
  process.stdout.write(result);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

function runNode(scriptPath, scriptArgs) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [scriptPath, ...scriptArgs], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${stderr || stdout || error.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}
