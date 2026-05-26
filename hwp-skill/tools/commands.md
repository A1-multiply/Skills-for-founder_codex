# 명령어 치트시트

명령어는 `hwp-skill` 폴더에서 실행합니다.

## 문서 읽기

```bash
node skill/hwp-document-suite/scripts/hwp_inspect.mjs ./sample.hwp --out-dir ./out
```

## 기본 편집

```bash
node skill/hwp-document-suite/scripts/hwp_edit.mjs info ./sample.hwp
node skill/hwp-document-suite/scripts/hwp_edit.mjs search ./sample.hwp --query "2025"
node skill/hwp-document-suite/scripts/hwp_edit.mjs replace-all ./sample.hwp ./out/edited.hwp --query "2025" --replacement "2026"
```

## 양식 표 채우기

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./sample.hwp ./out/filled.hwp --map ./examples/business-plan-overview-cells.json
```

JSON 안에 `"cleanPreset": "business-plan-guides"`가 있으면 표를 채운 뒤 예시/가이드 문구를 자동으로 지웁니다.
JSON 안에 `"removeNestedGuidesPreset": "business-plan-overview"`가 있으면 예시문이 있던 빈 중첩 안내 표까지 삭제합니다.

명령어에서 직접 지정:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./sample.hwp ./out/filled.hwp --map ./cells.json --clean-preset business-plan-guides
```

중첩 안내 표 제거까지 지정:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./sample.hwp ./out/filled.hwp --map ./cells.json --remove-nested-guides business-plan-overview
```

## 예시문 제거만 실행

```bash
node skill/hwp-document-suite/scripts/hwp_clean_text.mjs ./filled.hwp ./out/cleaned.hwp --preset business-plan-guides
```

## 빈 중첩 안내 표 제거만 실행

```bash
node skill/hwp-document-suite/scripts/hwp_remove_nested_guides.mjs ./cleaned.hwp ./out/final.hwp --preset business-plan-overview
```

## 내부에서 쓰는 도구

```bash
npx --yes --package kordoc --package pdfjs-dist kordoc ./sample.hwp --format json
npx --yes k-skill-rhwp info ./sample.hwp
npx --yes k-skill-rhwp search ./sample.hwp --query "target"
```
