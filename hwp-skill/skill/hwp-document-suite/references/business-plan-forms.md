# 한국 창업지원사업 사업계획서 양식

예비창업패키지, 초기창업패키지, 창업중심대학 등 한국 정부지원사업 HWP 양식을 채울 때 사용하는 참고 문서입니다.

## 기본 원칙

1. 원본 파일은 그대로 둡니다.
2. `작성본` 또는 `out` 같은 출력 폴더에 새 파일을 만듭니다.
3. 먼저 `kordoc`으로 문서를 읽어 제목, 표, 안내문을 파악합니다.
4. 대상 표는 제목과 렌더링 화면으로 확인합니다.
5. 표 안에는 심사위원이 바로 이해할 수 있게 짧은 개조식으로 작성합니다.
6. 표를 채운 뒤 기존 예시/가이드 문구가 남아 있으면 `business-plan-guides` 프리셋으로 제거합니다.
7. 최종 파일을 다시 읽거나 렌더링해서 문구 반영 여부를 확인합니다.

## 창업 아이템 개요 요약표

`창업 아이템 개요(요약)` 표는 보통 아래 매핑으로 작성합니다.

```json
{
  "section": 0,
  "parentParagraph": 7,
  "control": 0,
  "cleanPreset": "business-plan-guides",
  "cells": {
    "1": "아이템명",
    "3": "분야/분류",
    "5": "아이템 개요",
    "7": "문제 인식",
    "9": "실현 가능성",
    "11": "성장 전략",
    "13": "팀 구성"
  }
}
```

## 작성 기준

- `명칭`: 제품명만 짧게 작성합니다.
- `범주`: 산업 분야와 제품군을 함께 씁니다.
- `아이템 개요`: 무엇을 자동화하는지, 어떤 구조인지, 고객 이익이 무엇인지 한 번에 보이게 씁니다.
- `문제 인식`: 누가 불편한지, 기존 방식이 왜 비효율적인지, 반복되는 손실이 무엇인지 씁니다.
- `실현 가능성`: 핵심 구동 구조, 시제품 형태, 테스트 계획을 씁니다.
- `성장 전략`: 첫 고객군, 수익 모델, 확장 경로를 씁니다.
- `팀 구성`: 대표자의 역할, 외부 협력, 검증 계획을 씁니다.

## 예시문 제거

정부지원사업 양식은 표 셀 안에 파란색 예시문이나 중첩 안내 박스가 들어 있는 경우가 많습니다. 셀에 새 내용을 넣은 뒤에도 예시문이 남으면 제출본이 지저분해지므로 아래 방식으로 정리합니다.

JSON에 포함:

```json
{
  "cleanPreset": "business-plan-guides"
}
```

명령어에서 지정:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./template.hwp ./out/draft.hwp --map ./cells.json --clean-preset business-plan-guides
```

예시문 제거만 따로 실행:

```bash
node skill/hwp-document-suite/scripts/hwp_clean_text.mjs ./draft.hwp ./out/cleaned.hwp --preset business-plan-guides
```

현재 프리셋은 예비창업패키지 사업계획서 개요표에 있는 대표적인 예시 문구와 안내 문구를 공백으로 바꿉니다. 중첩 표의 테두리나 빈 박스는 남을 수 있지만, 화면에 보이는 예시 텍스트는 제거됩니다.

## 좌표 찾기

공통 좌표가 맞지 않으면 아래 순서로 찾습니다.

1. 근처 페이지를 렌더링합니다.

```bash
npx --yes k-skill-rhwp render input.hwp --page 2 --format html
```

2. 복사본에 안전하게 테스트 문구를 넣습니다.

```bash
npx --yes k-skill-rhwp set-cell-text input.hwp probe.hwp --section 0 --parent-paragraph 7 --control 0 --cell 0 --text PROBE
```

3. `probe.hwp`를 다시 렌더링하거나 읽어서 `PROBE`가 들어간 위치를 확인합니다.

4. 위치가 맞으면 `hwp_fill_cells.mjs`로 실제 작성본을 만듭니다.

## 한계

- 현재 `k-skill-rhwp` 편집 경로는 텍스트 입력은 가능하지만 글자색을 직접 지정하는 옵션은 제한적입니다.
- 원본 셀이 이미 파란색 안내문 스타일이면 새 텍스트가 해당 스타일을 일부 상속할 수 있습니다.
- HWPX 입력은 편집 경로에서 HWP로 저장될 수 있습니다.
