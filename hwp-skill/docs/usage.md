# 사용 가이드

## 할 수 있는 일

- `.hwp`, `.hwpx`, `.hwpml` 파일 읽기
- 읽기 쉬운 Markdown 추출
- 표, 이미지, 컨트롤, 메타데이터가 포함된 JSON 구조 추출
- 문서 요약 리포트 생성
- HWP 파일을 원본과 분리된 새 파일로 수정
- 텍스트 치환, 삽입, 삭제, 표 생성, 표 셀 입력
- JSON 매핑으로 알려진 HWP 양식 표 자동 작성
- 사업계획서 양식 안의 예시/가이드 문구 자동 공백 처리

## 권장 흐름

1. 먼저 문서를 읽고 구조를 확인합니다.
2. Markdown과 요약 파일로 내용 흐름을 파악합니다.
3. 표와 컨트롤 위치가 중요하면 JSON을 확인합니다.
4. 수정 전에는 검색 또는 구조 조회로 좌표를 잡습니다.
5. 수정본은 항상 새 파일로 저장합니다.
6. 수정한 파일을 다시 읽거나 렌더링해서 반영 여부를 확인합니다.

## 문서 읽기

```bash
node skill/hwp-document-suite/scripts/hwp_inspect.mjs ./input.hwp --out-dir ./out
```

생성 파일:

```text
out/input.json
out/input.md
out/input.summary.md
```

## 편집 명령

```bash
node skill/hwp-document-suite/scripts/hwp_edit.mjs info ./input.hwp
node skill/hwp-document-suite/scripts/hwp_edit.mjs search ./input.hwp --query "target"
node skill/hwp-document-suite/scripts/hwp_edit.mjs replace-all ./input.hwp ./out/edited.hwp --query "old" --replacement "new"
node skill/hwp-document-suite/scripts/hwp_edit.mjs insert-text ./input.hwp ./out/edited.hwp --section 0 --paragraph 0 --offset 0 --text "text"
node skill/hwp-document-suite/scripts/hwp_edit.mjs delete-text ./input.hwp ./out/edited.hwp --section 0 --paragraph 0 --offset 0 --length 4
node skill/hwp-document-suite/scripts/hwp_edit.mjs create-table ./input.hwp ./out/table.hwp --section 0 --paragraph 1 --offset 0 --rows 2 --cols 3
node skill/hwp-document-suite/scripts/hwp_edit.mjs set-cell-text ./input.hwp ./out/cell.hwp --section 0 --parent-paragraph 1 --control 0 --cell 0 --text "value"
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./input.hwp ./out/filled.hwp --map ./examples/business-plan-overview-cells.json
```

## 사업계획서 개요표 채우기

예비창업패키지 사업계획서의 `창업 아이템 개요(요약)` 같은 표는 JSON 매핑으로 채웁니다.

```json
{
  "section": 0,
  "parentParagraph": 7,
  "control": 0,
  "cleanPreset": "business-plan-guides",
  "removeNestedGuidesPreset": "business-plan-overview",
  "formatPreset": "business-plan-overview-compact",
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

실행:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./template.hwp ./out/draft.hwp --map ./examples/business-plan-overview-cells.json
```

`cleanPreset`을 넣으면 표 셀 작성 후 양식 안의 예시/가이드 문구가 자동으로 공백 처리됩니다.

`removeNestedGuidesPreset`을 넣으면 예시문이 있던 빈 중첩 안내 표까지 삭제합니다. Windows에서 한컴오피스 한글 COM 자동화를 사용하므로, 한글이 열려 있거나 보안창에 멈춰 있으면 닫고 다시 실행합니다.

`formatPreset`을 넣으면 개요표 작성 셀을 검정색, 비기울임, 작은 글씨로 정리합니다. 원본 파란 안내문 스타일을 상속한 채 제출하지 않도록 기본으로 사용합니다.

개요표 문장은 아래 구조를 기본으로 작성합니다.

```text
[ 한 줄 가치제안 제목 ]

- 제품/서비스가 하는 일
- 고객의 어떤 문제를 줄이는지

- 핵심 기능 : 작동 방식과 주요 기능
- 고객 혜택 : 시간, 비용, 품질, 운영 효율 개선
```

문제 인식, 실현 가능성, 성장 전략도 같은 방식으로 `대괄호 제목 + 짧은 bullet + 핵심 항목` 구조를 유지합니다. 단문 한 줄만 넣지 않습니다.

최종 작성본은 셀 안에서 실제 줄바꿈 개조식으로 정리합니다. 기본 구조는 `대괄호 주제 1줄 + 하이픈 항목 3~4줄`입니다.

셀당 기본 구조는 `주제 1개 + 항목 최대 4개`입니다. 페이지가 넘어갈 정도로 길어지면 내용을 줄이거나 뒤쪽 세부 항목으로 분리합니다.

강조가 필요하고 여백이 충분하면 한 줄만 파란색/큰 글씨로 넣습니다. 이때 왼쪽에 붙이지 말고 셀 안에서 시각적으로 가운데에 오게 배치합니다.

프리셋을 명령어에서 직접 지정할 수도 있습니다.

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./template.hwp ./out/draft.hwp --map ./cells.json --clean-preset business-plan-guides
```

중첩 안내 표 제거를 명령어에서 직접 지정:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./template.hwp ./out/draft.hwp --map ./cells.json --remove-nested-guides business-plan-overview
```

## 참고

- 읽기는 `kordoc`이 처리합니다.
- 편집은 `k-skill-rhwp`가 처리합니다.
- 예시문 제거는 `hwp_clean_text.mjs`가 처리합니다.
- 고급 레이아웃 진단은 upstream `rhwp`를 사용합니다.
- HWPX 편집은 도구 지원 범위에 따라 HWP로 저장될 수 있습니다.
