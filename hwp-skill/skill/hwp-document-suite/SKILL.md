---
name: hwp-document-suite
description: Read, analyze, summarize, convert, compare, and edit Korean Hangul Office documents including .hwp, .hwpx, and .hwpml files. Use for HWP/HWPX inspection, table extraction, Markdown/JSON conversion, startup-item overview table drafting, form-cell filling, guide-text cleanup, and safe HWP editing.
---

# HWP Document Suite

## Token Rule

Use the smallest context path that can finish the task.

- Do not read scripts or long references unless debugging or changing them.
- Prefer running bundled scripts over explaining their internals.
- For repeated startup overview work, use the known overview workflow below without re-reading all docs.
- For simple revisions to an already generated overview HWP, patch only the requested cell(s); do not inspect, parse, or rewrite the whole document unless the user asks.
- Read `references/business-plan-forms.md` only for unusual form layouts or when writing full guidance.
- Read `references/reference-plan-pattern.md` only when the user explicitly asks to match a reference-plan style.
- Keep original HWP/HWPX read-only; save outputs separately.
- Run Hancom setup once per machine/session, not during every document task.

## Tool Routing

| Goal | Use |
| --- | --- |
| Inspect/read/summarize HWP/HWPX | `scripts/hwp_inspect.mjs` |
| Search/replace/insert/delete/create table | `scripts/hwp_edit.mjs` |
| Fill known table cells from JSON | `scripts/hwp_fill_cells.mjs` |
| Remove blue guide text | `scripts/hwp_clean_text.mjs` |
| Remove nested guide boxes | `scripts/hwp_remove_nested_guides.mjs` |
| Format overview cells black/non-italic | `scripts/hwp_format_overview.mjs` |
| Write visible line-broken overview bullets | `scripts/hwp_layout_overview.mjs --layout-map` |
| Hancom warning/open check | `scripts/hwp_hancom_preflight.mjs` |
| One-time Hancom automation setup | `scripts/hwp_hancom_setup.mjs` |
| Hancom COM re-save | `scripts/hwp_hancom_resave.mjs` |

## One-Time Hancom Setup

Before the first HWP editing task on Windows, ask the user once for broad Hancom automation permission, then run:

```bash
node scripts/hwp_hancom_setup.mjs
```

This intentionally writes the bundled FilePathCheckDLL path to HKCU. After that, document scripts should only check/register the module and should not rewrite registry keys every time.

## Startup Overview Fast Path

Use this for `창업 아이템 개요(요약)` / overview-only business-plan files.

Known common coordinates:

- overview-only file `창업아이템 개요부분.hwp`: `section:0`, `parentParagraph:1`, `control:0`
- full 2026 preliminary-startup template: `section:0`, `parentParagraph:7`, `control:0`
- cells: `1` name, `3` category, `5` overview, `7` problem, `9` feasibility, `11` growth, `13` team

Default writing rules:

- Ask style questions only when the user asks to choose; if they say “그냥/기본/알아서”, proceed.
- Default: concise Korean bullet style, 11pt base font, black, non-italic, natural line spacing, slight consistent top padding, one page max.
- Ask the desired font only when the user is setting style. If not specified, use the same font as prior generated overview files: `휴먼명조`.
- Keep font family consistent across all filled cells and emphasis lines. If a layout map sets `fontFamily`, use it for every line.
- Each content cell: `[핵심 제목]` + separate bullet lines. Never collapse bullets into one paragraph.
- Always make the bracket headline line (`[ ... ]`) bold, with the same font family and normal black color unless the user explicitly requests a different style.
- If crowded: shorten bullets first; then reduce inner margins/blank areas consistently; then reduce font/line spacing slightly. Do not make lines overlap.
- Default bullet count: 3-5 lines per content cell. Match user-requested line counts when given.
- Growth strategy may be stage-based, channel-based, customer-based, product-line-based, or year-based only when useful/requested.
- Team cell must show execution feasibility: founder role + realistic masked role partners with field and years of experience. No real personal data unless provided and approved.
- Image cells: ask whether to generate images or write text placeholders. If generating and ratio is unspecified, use 1:1 and save under `images/`.
- Empty/image cells are part of the layout balance. If image areas or unused cells create excessive whitespace, fill them with useful captions/images or reduce the surrounding blank space consistently so the whole page feels balanced.

Fast workflow:

1. Draft a compact JSON layout map with `cells` arrays, one string per visible line.
2. Remove nested guide boxes:
   ```bash
   node scripts/hwp_remove_nested_guides.mjs <input.hwp> <temp-clean.hwp> --preset business-plan-overview-only
   ```
3. Write line-broken cells:
   ```bash
   node scripts/hwp_layout_overview.mjs <temp-clean.hwp> <final.hwp> --layout-map <map.json>
   ```
4. Verify:
   ```bash
   node scripts/hwp_hancom_preflight.mjs <final.hwp>
   ```
5. Delete temp files; leave one final HWP unless the user asks otherwise.

If `Hwp.exe` is already open, COM scripts intentionally fail before opening files to prevent Hancom security popups. Close/terminate `Hwp.exe`, then rerun.

## Micro-Edit Fast Path

Use this when the user asks to adjust one existing overview cell, e.g. color, alignment, line count, wording, or emphasis.

- Do not run `hwp_inspect.mjs` unless the target cell is unknown.
- Do not rebuild all cells.
- Create a tiny layout map containing only the target cell and optional `emphasis`.
- Keep the existing/default font consistent; include `fontFamily` only when the user requested a font change.
- Run `hwp_layout_overview.mjs` once, writing back to the final HWP or to a new final file as requested.
- Run `hwp_hancom_preflight.mjs` only for final delivery; skip parse verification unless the user asks or the change is risky.

Example:

```json
{
  "section": 0,
  "parentParagraph": 1,
  "control": 0,
  "fontFamily": "휴먼명조",
  "emphasis": {
    "11": { "line": -1, "color": "#008000", "align": "center", "fontSize": 1050, "bold": true }
  },
  "cells": {
    "11": [
      "[성장전략 제목]",
      "- 항목 1",
      "- 항목 2",
      "- 항목 3",
      "- 항목 4",
      "핵심: 가운데 정렬 강조 문장"
    ]
  }
}
```

## Generic Read/Edit

For unknown files, inspect first:

```bash
node scripts/hwp_inspect.mjs <input.hwp> --out-dir ./out
```

For ordinary edits:

```bash
node scripts/hwp_edit.mjs info <input.hwp>
node scripts/hwp_edit.mjs search <input.hwp> --query "text"
node scripts/hwp_edit.mjs replace-all <input.hwp> <output.hwp> --query "old" --replacement "new"
```

For known table-cell maps:

```bash
node scripts/hwp_fill_cells.mjs <input.hwp> <output.hwp> --map <cells.json>
```

## Verification

After edits, verify only as much as the task needs:

- For final HWP delivery: run `hwp_hancom_preflight.mjs`.
- For content-sensitive edits: run `hwp_inspect.mjs` and check requested phrases.
- Mention unsupported/uncertain layout elements only when relevant.

Do not run Git operations unless the user explicitly asks.
