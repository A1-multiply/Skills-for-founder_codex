---
name: A1-HWP-SKILL
description: Read, analyze, summarize, convert, compare, and edit Korean Hangul Office documents including .hwp, .hwpx, and .hwpml files. Use for HWP/HWPX inspection, table extraction, Markdown/JSON conversion, startup-item overview table drafting, form-cell filling, guide-text cleanup, and safe HWP editing.
---

# A1 HWP Skill

## Token Rule

Use the smallest context path that can finish the task.

- Do not read scripts or long references unless debugging or changing them.
- For repeated overview generation, do not inspect unless the target table is unknown or a write fails.
- If inspection shows no table-like blocks, stop immediately and report that the file is not an overview-table form; do not keep trying coordinates.
- If the user asks to use a non-table business plan as source material, read/summarize that source, then write a new output using the overview-table template. Do not try to fill cells inside the non-table source file.
- Prefer running bundled scripts over explaining their internals.
- For repeated startup overview work, use the known overview workflow below without re-reading all docs.
- For full overview generation, create one compact spec JSON and run `hwp_generate_overview.mjs`; do not create one-off JS/Python wrappers.
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
| Generate overview from compact spec | `scripts/hwp_generate_overview.mjs --spec` |
| Write visible line-broken overview bullets | `scripts/hwp_layout_overview.mjs --layout-map` |
| Keep overview table inside page | `scripts/hwp_fit_overview_page.mjs` |
| Set saved images as table-cell backgrounds | `scripts/hwp_set_cell_background_images.mjs --images` |
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

Use this for `李쎌뾽 ?꾩씠??媛쒖슂(?붿빟)` / overview-only business-plan files.

Known common coordinates:

- overview-only file `李쎌뾽?꾩씠??媛쒖슂遺遺?hwp`: `section:0`, `parentParagraph:1`, `control:0`
- full 2026 preliminary-startup template: `section:0`, `parentParagraph:7`, `control:0`
- cells: `1` name, `3` category, `5` overview, `7` problem, `9` feasibility, `11` growth, `13` team

Default writing rules:

- Ask style questions only when the user asks to choose; if they say ?쒓렇??湲곕낯/?뚯븘?쒋? proceed.
- Default: concise Korean bullet style, 11pt base font, black, non-italic, natural line spacing, slight consistent top padding, one page max.
- Never change text outside the target table, such as section titles, form headings, page headers, footers, or official labels outside editable cells. Solve overflow by adjusting only table content, table cell layout, wording, row height, split strategy, or image/blank-cell balance.
- Never change overview table width, page width, outside title, or official form layout. If a table looks shifted, ask before running any fit/offset correction.
- Ask the desired font only when the user is setting style. If not specified, use the same font as prior generated overview files: `?대㉫紐낆“`.
- Keep font family consistent across all filled cells and emphasis lines. If a layout map sets `fontFamily`, use it for every line.
- Category/form label cell (`踰붿＜`, `遺꾩빞`, `?쒗뭹援?, `?낆쥌`) is not an explanation area. Write one short category phrase on one line only, e.g. `罹좏븨 媛꾪렪??, `?붿????뚮즺`, `臾멸뎄 ?뚰뭹`, `二쇰갑 ?λ퉬`. Do not use long slash chains.
- Each content cell: `[?듭떖 ?쒕ぉ]` + separate bullet lines. Never collapse bullets into one paragraph.
- Always make the bracket headline line (`[ ... ]`) bold, with the same font family and normal black color unless the user explicitly requests a different style.
- If crowded: shorten bullets first; then reduce inner margins/blank areas consistently; then reduce font/line spacing slightly. Do not make lines overlap.
- Default bullet count: 3-5 lines per content cell. Match user-requested line counts when given.
- Growth strategy may be stage-based, channel-based, customer-based, product-line-based, or year-based only when useful/requested.
- Team cell must show execution feasibility: founder role + realistic masked role partners with field and years of experience. No real personal data unless provided and approved.
- Image cells: ask whether to generate images or write text placeholders. If generating and ratio is unspecified, use 1:1 and save under `images/`.
- When images are generated for an overview, always save the image files under an `images/` folder next to the output/workspace.
- For image rows, put the real image in the large image cell and put only a short `-` caption in the small description/title cell below it. Do not put filenames or prose in the image cell.
- Images must fit inside their own cell and must never push content to the next page. If the image overflows, regenerate/reinsert with smaller dimensions or crop/pad the bitmap; do not resize text outside the table.
- Do not insert images as floating/inline picture objects. Use Hancom's cell border/fill background image path (`? ?뚮몢由?諛곌꼍 -> 諛곌꼍 洹몃┝`) so the image is bound to the cell and cannot push pages.
- The intended layout is: large top image cell has the image as the cell background, and the small bottom cell contains a bold-looking `-` caption.
- Use polished, content-specific images. Avoid crude diagram screenshots, cluttered text, low-end clipart, and generic decorative images.
- Set image backgrounds by writing a short marker into the image cell with `hwp_layout_overview.mjs`, then selecting that marker cell and applying the PNG as the cell background with `hwp_set_cell_background_images.mjs`.
- After image background insertion, do not run page-fit correction automatically. The form's original table width and page layout must remain unchanged.
- `hwp_set_cell_background_images.mjs` uses `pyhwpx`; install it once with `pip install pyhwpx` when the environment is missing it.
- Empty/image cells are part of the layout balance. If image areas or unused cells create excessive whitespace, fill them with useful captions/images or reduce the surrounding blank space consistently so the whole page feels balanced.

Fast workflow:

1. Draft one compact spec JSON with `template`, `output`, `cells`, and optional `images`.
2. Run:
   ```bash
   node scripts/hwp_generate_overview.mjs --spec <spec.json>
   ```
3. Verify only with targeted marker/content checks unless layout changed or the user asks for deeper inspection.
4. Delete temp files; leave one final HWP unless the user asks otherwise.

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
  "fontFamily": "?대㉫紐낆“",
  "emphasis": {
    "11": { "line": -1, "color": "#008000", "align": "center", "fontSize": 1050, "bold": true }
  },
  "cells": {
    "11": [
      "[?깆옣?꾨왂 ?쒕ぉ]",
      "- ??ぉ 1",
      "- ??ぉ 2",
      "- ??ぉ 3",
      "- ??ぉ 4",
      "?듭떖: 媛?대뜲 ?뺣젹 媛뺤“ 臾몄옣"
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
