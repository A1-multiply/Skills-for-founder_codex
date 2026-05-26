---
name: hwp-document-suite
description: Read, analyze, summarize, convert, compare, and edit Korean Hangul Office documents including .hwp, .hwpx, and .hwpml files. Use when Codex needs to inspect document contents, extract full structure, understand tables/images/form fields, produce Markdown or JSON, compare document versions, or modify HWP documents by replacing text, inserting/deleting text, creating tables, or setting table-cell text.
---

# HWP Document Suite

## Core Rule

Treat the original HWP/HWPX file as read-only. Always write conversions, reports, and edited documents to a separate output path unless the user explicitly asks to overwrite.

Use this routing:

| User goal | Primary tool |
| --- | --- |
| Read contents, tables, headings, metadata, and overall structure | `kordoc` |
| Produce Markdown or structured JSON | `kordoc` |
| Extract form fields from parsed blocks | `kordoc` Node API |
| Compare readable contents of two documents | `kordoc` Node API or JSON/Markdown diff |
| Edit HWP body text or table contents | `k-skill-rhwp` |
| Fill a known HWP form/table from draft text | `scripts/hwp_fill_cells.mjs` |
| Remove leftover guide/example text from known form templates | `scripts/hwp_clean_text.mjs` |
| Remove leftover nested guide table boxes from known HWP templates | `scripts/hwp_remove_nested_guides.mjs` |
| Apply compact black non-italic formatting to known overview cells | `scripts/hwp_format_overview.mjs` |
| Compose readable line-broken overview bullets with optional blue emphasis | `scripts/hwp_layout_overview.mjs` |
| Inspect low-level layout, page rendering, thumbnails, locked/read-only HWP conversion | upstream `rhwp` CLI |

## Quick Start

Prefer the bundled scripts when possible:

```bash
node hwp-document-suite/scripts/hwp_inspect.mjs ./input.hwp --out-dir ./out
node hwp-document-suite/scripts/hwp_edit.mjs info ./input.hwp
node hwp-document-suite/scripts/hwp_edit.mjs replace-all ./input.hwp ./out/edited.hwp --query 2025 --replacement 2026
node hwp-document-suite/scripts/hwp_fill_cells.mjs ./input.hwp ./out/filled.hwp --map ./cells.json
node hwp-document-suite/scripts/hwp_clean_text.mjs ./out/filled.hwp ./out/cleaned.hwp --preset business-plan-guides
node hwp-document-suite/scripts/hwp_remove_nested_guides.mjs ./out/cleaned.hwp ./out/final.hwp --preset business-plan-overview
node hwp-document-suite/scripts/hwp_format_overview.mjs ./out/final.hwp ./out/final-formatted.hwp --preset business-plan-overview-compact
node hwp-document-suite/scripts/hwp_layout_overview.mjs ./out/final-formatted.hwp ./out/final-layout.hwp --preset pork-grill-overview
```

The scripts call `npx` packages on demand, so they work in a freshly cloned repository with Node.js 18+.

## Reading And Structure Extraction

1. Confirm the input extension is `.hwp`, `.hwpx`, or `.hwpml`.
2. Run `scripts/hwp_inspect.mjs` to create:
   - `<name>.json`: structured parse output
   - `<name>.md`: readable Markdown
   - `<name>.summary.md`: compact structure summary
3. Read the Markdown for narrative content.
4. Read JSON `blocks` for tables, images, controls, metadata, and section-level structure.
5. When answering the user, include:
   - document title or likely topic
   - section/headline outline
   - important body points
   - table count and notable table contents
   - images/forms/controls if present
   - any parse limitations or suspicious empty sections

Raw command if the script is not suitable:

```bash
npx --yes --package kordoc --package pdfjs-dist kordoc ./input.hwp --format json > ./out/input.json
npx --yes --package kordoc --package pdfjs-dist kordoc ./input.hwp -o ./out/input.md
```

## Editing

For edits, first inspect the document so coordinates and structure are known:

```bash
node hwp-document-suite/scripts/hwp_edit.mjs info ./input.hwp
node hwp-document-suite/scripts/hwp_edit.mjs search ./input.hwp --query "old text"
```

Then apply the smallest edit that satisfies the request:

```bash
# Whole-document body text replacement
node hwp-document-suite/scripts/hwp_edit.mjs replace-all ./input.hwp ./out/edited.hwp --query "2025" --replacement "2026"

# Insert text at section/paragraph/offset
node hwp-document-suite/scripts/hwp_edit.mjs insert-text ./input.hwp ./out/edited.hwp --section 0 --paragraph 0 --offset 0 --text "Title"

# Delete text at section/paragraph/offset
node hwp-document-suite/scripts/hwp_edit.mjs delete-text ./input.hwp ./out/edited.hwp --section 0 --paragraph 0 --offset 4 --length 2

# Create a table
node hwp-document-suite/scripts/hwp_edit.mjs create-table ./input.hwp ./out/with-table.hwp --section 0 --paragraph 1 --offset 0 --rows 3 --cols 4

# Set table-cell text after locating parent paragraph/control/cell coordinates
node hwp-document-suite/scripts/hwp_edit.mjs set-cell-text ./input.hwp ./out/edited.hwp --section 0 --parent-paragraph 1 --control 0 --cell 0 --text "Total"
```

Important editing limits:

- `k-skill-rhwp` edits save to HWP output. If the input is HWPX, expect HWP output unless the user only needs Markdown-to-HWPX creation through `kordoc`.
- `replace-all` targets body paragraphs; table cells may require `set-cell-text`.
- Do not replace across paragraph boundaries with one command. Use multiple edits.
- Do not rely on visual coordinates; use `info`, `search`, and parsed structure first.

## Filling Form Tables

Use this workflow when the user asks to put drafted text into a HWP/HWPX template, especially Korean government forms with tables.

1. Inspect/read the document first with `kordoc`.
2. Identify the target section by visible heading text.
3. Find the parent paragraph and control for the target table:
   - Use `render <file> --page N --format html` to see the target table visually.
   - Use one safe probe in a copy if needed: `set-cell-text <input> <probe-output> --section 0 --parent-paragraph P --control C --cell 0 --text PROBE`.
   - Re-render the probe output to confirm which table was touched.
4. Build a JSON cell map and run `hwp_fill_cells.mjs`.
5. If the source form contains blue guide/example text, include `"cleanPreset": "business-plan-guides"` in the map or pass `--clean-preset business-plan-guides`.
6. If the source form contains nested guide boxes, include `"removeNestedGuidesPreset": "business-plan-overview"` in the map or pass `--remove-nested-guides business-plan-overview`.
7. For judge-facing overview tables, include `"formatPreset": "business-plan-overview-compact"` so generated text is black, non-italic, compact, and not inherited from blue guide styles.
8. Re-read the output with `kordoc` and check that all target phrases appear and old guide/example phrases are gone.
9. Delete temporary probe/intermediate files; leave only the final output unless the user asks otherwise.

For the 2026 Preliminary Startup Package business plan template, the `창업 아이템 개요(요약)` table is commonly:

```json
{
  "section": 0,
  "parentParagraph": 7,
  "control": 0,
  "cleanPreset": "business-plan-guides",
  "removeNestedGuidesPreset": "business-plan-overview",
  "formatPreset": "business-plan-overview-compact",
  "cells": {
    "1": "item name",
    "3": "category",
    "5": "item overview",
    "7": "problem",
    "9": "solution / feasibility",
    "11": "growth strategy",
    "13": "team"
  }
}
```

Example:

```bash
node hwp-document-suite/scripts/hwp_fill_cells.mjs ./template.hwp ./out/draft.hwp --map ./overview-cells.json
```

When `cleanPreset` is present, `hwp_fill_cells.mjs` first writes the mapped table cells, then runs `hwp_clean_text.mjs` to blank known guide/example phrases in the HWP body streams. This prevents old examples from remaining below the newly written answer in nested guide boxes.

When `removeNestedGuidesPreset` is present on Windows with Hancom Office installed, `hwp_fill_cells.mjs` then runs `hwp_remove_nested_guides.mjs` through Hancom COM automation to delete the leftover 1x1 nested guide table controls from the overview cells. If Hancom is open or stuck on a security dialog, close Hancom or rerun after terminating `Hwp.exe`.

Drafting guidance for judges:

- Do not fill business-plan overview cells with a single loose sentence. Use the recurring Korean startup-plan pattern:
  - bracketed headline: `[ product/service value in one sentence ]`
  - short explanatory bullets beginning with `-`
  - a small section label such as `- 핵심 기능 :`, `- 고객 혜택 :`, `- 2026년 :`
  - concrete status/plan bullets for feasibility and growth strategy.
- For `아이템 개요`, write: bracketed value proposition, 1-2 explanation bullets, then key contents such as function, customer benefit, sales path, or operating mechanism.
- For `문제 인식`, write: bracketed problem statement, current pain, why existing behavior fails, measurable burden if available, and why the item solves it.
- For `실현 가능성`, write: bracketed implementation statement, current build status, prototype mechanism, test plan, and partners/resources.
- For `성장전략`, write: bracketed market goal, then year-by-year or stage-by-stage commercialization bullets.
- For `팀 구성`, write: bracketed execution structure, founder role, external partners, validation/customer feedback role.
- Keep the tone like a government startup-plan form: concise, declarative, evidence-oriented, and easy for judges to scan.
- When the user wants human-readable bullet layout, use real in-cell paragraph breaks: bracketed topic line first, then `-` bullets on separate lines. Do not leave the answer as a long run-on paragraph.
- If the tool path cannot preserve line breaks, use `scripts/hwp_layout_overview.mjs` after filling. On Windows it must use Hancom COM layout/save so the final HWP opens without Hancom's document-security recovery warning; do not deliver raw low-level `splitParagraphInCell` output as the final user file.
- Keep each overview cell to at most five scan-friendly chunks: one bracketed topic plus up to four `-` items. If content would overflow the page, shorten the cell or split detail into a later section instead of cramming text.
- Default styling for generated overview answers is black text, non-italic, compact font size. Use blue/larger text only for a specific emphasis line when it improves scanability, and keep it centered or visually balanced if there is extra whitespace.
- Remove guide/example text before final delivery; the visible text must be the user's answer, not the template examples.
- Remove nested guide table boxes before final delivery; empty dotted boxes are not acceptable in the filled output.
- Start each cell with the business value, not background explanation.
- Prefer concrete phrases: target customer, pain point, device mechanism, output model, revenue model, validation plan.
- If the user requests blue text, first try filling cells that already contain blue guide text so the document style may be inherited. If the CLI cannot explicitly set color, disclose that limitation.

Read `references/business-plan-forms.md` for repeatable patterns and a ready JSON template.

## Verification

After every edit:

1. Run `info` on the output file.
2. Re-run `hwp_inspect.mjs` on the output when text/table content matters.
3. Confirm the requested text/table/structure changed.
4. Confirm the original file remains untouched.
5. Mention any unsupported elements such as charts, complex controls, locked documents, or HWPX round-trip limits.

## Advanced Layout Debugging

Use upstream `rhwp` only when the user asks for low-level page/layout diagnosis, thumbnails, or read-only unlock conversion:

```bash
rhwp info ./input.hwp
rhwp export-svg ./input.hwp -o ./out/svg -p 0 --debug-overlay
rhwp dump ./input.hwp -s 0 -p 3
rhwp thumbnail ./input.hwp -o ./out/thumbnail.png
rhwp convert ./locked.hwp ./out/unlocked.hwp
```

Read `references/tooling.md` for command details and failure handling.
