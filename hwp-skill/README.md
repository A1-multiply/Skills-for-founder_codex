# HWP Skill Package

Codex skill package for Korean Hangul Office documents: `.hwp`, `.hwpx`, `.hwpml`.

## Folder Roles

| Folder | Role |
| --- | --- |
| `skill/hwp-document-suite/` | Actual Codex skill to install |
| `docs/` | Human-readable usage and structure docs |
| `examples/` | Example prompts and JSON maps |
| `tools/` | Command cheat sheets |

## Feature Roles

| Feature | What It Does | Use When |
| --- | --- | --- |
| Read document | Extracts readable Markdown from HWP/HWPX/HWPML | User asks what the file says |
| Analyze structure | Extracts JSON blocks, headings, metadata, tables, controls | User asks for full structure/table analysis |
| Summarize | Produces compact document understanding from extracted content | User wants one-page or concise analysis |
| Basic edit | Searches, replaces, inserts, deletes text, creates tables | User asks to modify an HWP safely |
| Table-cell edit | Writes text into a specific HWP table cell | User asks to fill a form/table cell |
| Form fill | Applies many table-cell edits from one JSON map | User asks to fill a known template or business plan form |
| Verify output | Re-reads/renders edited output and checks requested text exists | After any edit or form fill |
| Advanced debug | Uses upstream `rhwp` for layout, SVG, dump, thumbnail, locked files | User asks for layout/debug details |

## Main Files

| File | Role |
| --- | --- |
| `skill/hwp-document-suite/SKILL.md` | Core instructions Codex reads when the skill is triggered |
| `skill/hwp-document-suite/scripts/hwp_inspect.mjs` | Read/convert/summarize HWP files |
| `skill/hwp-document-suite/scripts/hwp_edit.mjs` | Thin wrapper around `k-skill-rhwp` editing commands |
| `skill/hwp-document-suite/scripts/hwp_fill_cells.mjs` | Batch-fill HWP table cells from a JSON map |
| `skill/hwp-document-suite/references/tooling.md` | Tool command reference |
| `skill/hwp-document-suite/references/business-plan-forms.md` | Startup business-plan form filling workflow |
| `examples/business-plan-overview-cells.json` | Example map for startup item overview summary tables |

## Install

From this folder:

```powershell
.\install.ps1
```

macOS/Linux:

```bash
./install.sh
```

Manual install:

```text
Copy hwp-skill/skill/hwp-document-suite into ~/.codex/skills/
```

## Use In Codex

Read and analyze:

```text
Use hwp-document-suite to read this HWP file and summarize the full contents, tables, images, and structure.
```

Edit:

```text
Use hwp-document-suite to replace every 2025 with 2026 in this HWP file and save a new edited file.
```

Fill a business-plan overview table:

```text
Use hwp-document-suite to fill the startup item overview summary table for my item. Keep it tight and judge-friendly.
```

## Direct Commands

Read and extract structure:

```bash
node skill/hwp-document-suite/scripts/hwp_inspect.mjs ./sample.hwp --out-dir ./out
```

Edit HWP:

```bash
node skill/hwp-document-suite/scripts/hwp_edit.mjs replace-all ./sample.hwp ./out/edited.hwp --query 2025 --replacement 2026
```

Fill a known form table:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./sample.hwp ./out/filled.hwp --map ./examples/business-plan-overview-cells.json
```

## Output Rule

- Original HWP/HWPX files stay untouched.
- Edited or filled files are written to a separate output path.
- Temporary probe files should be deleted after verification.
