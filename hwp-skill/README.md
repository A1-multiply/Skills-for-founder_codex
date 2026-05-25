# HWP Skill Package

Korean Hangul Office document skill package for Codex.

This folder is the human-friendly package. The actual Codex skill lives here:

```text
hwp-skill/
  skill/
    hwp-document-suite/
      SKILL.md
      scripts/
      references/
      agents/
  docs/
  examples/
  tools/
```

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

Ask Codex like this:

```text
Use hwp-document-suite to read this HWP file and summarize the full contents, tables, images, and structure.
```

For edits:

```text
Use hwp-document-suite to replace every 2025 with 2026 in this HWP file and save a new edited file.
```

## Direct Script Use

Read and extract structure:

```bash
node skill/hwp-document-suite/scripts/hwp_inspect.mjs ./sample.hwp --out-dir ./out
```

Edit HWP:

```bash
node skill/hwp-document-suite/scripts/hwp_edit.mjs replace-all ./sample.hwp ./out/edited.hwp --query 2025 --replacement 2026
```

See `docs/usage.md` and `examples/prompts.md` for more.
