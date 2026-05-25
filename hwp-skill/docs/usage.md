# Usage Guide

## What The Skill Can Do

- Read `.hwp`, `.hwpx`, and `.hwpml` files.
- Extract Markdown for readable content.
- Extract JSON for blocks, metadata, tables, images, and controls.
- Create a compact summary report.
- Edit HWP files with safe output paths.
- Replace text, insert text, delete text, create tables, and set table-cell text.
- Fill known HWP form tables from a JSON cell map.

## Recommended Workflow

1. Inspect the document first.
2. Review the generated Markdown and summary.
3. Use JSON when table/control structure matters.
4. For edits, search or inspect first so coordinates are known.
5. Save edits to a new output file.
6. Inspect the edited output again.

## Inspect Command

```bash
node skill/hwp-document-suite/scripts/hwp_inspect.mjs ./input.hwp --out-dir ./out
```

Expected output:

```text
out/input.json
out/input.md
out/input.summary.md
```

## Edit Commands

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

## Fill A Business Plan Overview Table

For templates like `창업 아이템 개요(요약)`, create a JSON map:

```json
{
  "section": 0,
  "parentParagraph": 7,
  "control": 0,
  "cells": {
    "1": "item name",
    "3": "category",
    "5": "overview",
    "7": "problem",
    "9": "feasibility",
    "11": "growth strategy",
    "13": "team"
  }
}
```

Then run:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./template.hwp ./out/draft.hwp --map ./examples/business-plan-overview-cells.json
```

## Notes

- Reading is handled by `kordoc`.
- Editing is handled by `k-skill-rhwp`.
- Advanced layout diagnostics can use upstream `rhwp`.
- HWPX editing may save as HWP depending on upstream support.
