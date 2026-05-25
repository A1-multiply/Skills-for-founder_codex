# Skills-for-founder_codex

Founder-focused Codex skills and helper tools.

## Packages

- `hwp-skill/`: Korean Hangul Office document skill package.
  - Reads `.hwp`, `.hwpx`, `.hwpml`.
  - Extracts Markdown/JSON.
  - Summarizes document structure and tables.
  - Edits HWP text and table cells.
  - Fills known government/business-plan form tables from JSON maps.

## HWP Skill At A Glance

| Area | Role | Main File |
| --- | --- | --- |
| Skill instructions | Tells Codex when and how to handle HWP/HWPX documents | `hwp-skill/skill/hwp-document-suite/SKILL.md` |
| Reading/analysis | Converts HWP/HWPX/HWPML into Markdown, JSON, and summary files | `hwp_inspect.mjs` |
| Basic editing | Wraps `k-skill-rhwp` for info/search/replace/insert/delete/table edits | `hwp_edit.mjs` |
| Form filling | Fills multiple HWP table cells from one JSON map | `hwp_fill_cells.mjs` |
| Business-plan forms | Reusable guidance for startup application forms | `business-plan-forms.md` |
| Example cell map | Ready example for startup item overview summary tables | `business-plan-overview-cells.json` |

## Install

```powershell
cd hwp-skill
.\install.ps1
```

macOS/Linux:

```bash
cd hwp-skill
./install.sh
```

Manual install:

```text
Copy hwp-skill/skill/hwp-document-suite into ~/.codex/skills/
```

## Start Here

Open `hwp-skill/README.md` for the full package guide.
