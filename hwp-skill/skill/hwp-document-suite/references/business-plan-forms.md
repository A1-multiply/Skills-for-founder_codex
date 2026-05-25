# Korean Startup Business Plan Forms

Use this reference when filling Korean government startup-plan HWP templates such as 예비창업패키지, 초기창업패키지, 창업중심대학, or similar forms.

## General Pattern

1. Preserve the original file.
2. Create an output folder such as `작성본` or `out`.
3. Read the document with `kordoc` to understand headings and table text.
4. Locate the target table by heading and render page if needed.
5. Fill cells with concise one-line bullets unless the table clearly supports multiple lines.
6. Verify by reading the final file with `kordoc`.

## Common Overview Fields

For `창업 아이템 개요(요약)`, use this mapping style:

```json
{
  "section": 0,
  "parentParagraph": 7,
  "control": 0,
  "cells": {
    "1": "삼겹살 무한회전 그릴 시스템",
    "3": "외식업 주방 자동화 / 고기구이 조리장비",
    "5": "• 삼겹살을 자동 회전시켜 균일하게 굽는 업소용 그릴 장비; 뒤집기 노동·조리 편차·기름 튐을 줄여 매장 운영 효율을 높임",
    "7": "• 고깃집은 굽기 품질이 직원 숙련도와 고객 개입에 좌우됨; 피크타임 뒤집기 업무와 덜 익음/탐/연기 불만이 반복됨",
    "9": "• 회전 모터·고기 고정 홀더·열원 간격·기름 배출 구조를 결합한 시제품 제작; 테이블형/주방형 모델로 매장 테스트 추진",
    "11": "• 초기 시장은 삼겹살 전문점·무한리필 매장·프랜차이즈; 장비 판매, 렌탈/유지보수, 소모품 공급으로 수익화",
    "13": "• 대표자가 외식 현장 문제 정의와 제품 기획을 총괄; 기구/전기 협력사와 시제품 제작 후 테스트 매장 피드백으로 개선"
  }
}
```

## Drafting Rules

- `명칭`: product name only.
- `범주`: industry + product category.
- `아이템 개요`: what it is + how it works + customer benefit.
- `문제 인식`: who suffers + why current process fails + measurable pain if known.
- `실현 가능성`: prototype mechanism + development stage + test plan.
- `성장전략`: first target customer + revenue model + expansion path.
- `팀 구성`: founder role + external partners + validation plan.

## Coordinate Discovery

If the common coordinates do not work:

1. Render nearby pages:

```bash
npx --yes k-skill-rhwp render input.hwp --page 2 --format html
```

2. Probe likely parent/control pairs on a copied output:

```bash
npx --yes k-skill-rhwp set-cell-text input.hwp probe.hwp --section 0 --parent-paragraph 7 --control 0 --cell 0 --text PROBE
```

3. Render/read `probe.hwp` and confirm where `PROBE` landed.

4. Use `hwp_fill_cells.mjs` once the table is known.

## Known Limits

- `k-skill-rhwp` currently fills text but does not expose a direct font-color option.
- Filling a cell that contains a nested guide table may leave guide text visible in extracted Markdown or visual render. Use short, top-level text and tell the user to do final visual QA in Hancom if strict submission formatting matters.
- HWPX input may be saved as HWP when using the editing path.
