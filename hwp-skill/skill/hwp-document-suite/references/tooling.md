# HWP/HWPX Tooling Reference

## Runtime

- Node.js 18+ is required for the bundled scripts and `npx` workflows.
- Network access may be needed the first time `npx` downloads `kordoc`, `pdfjs-dist`, or `k-skill-rhwp`.
- Prefer local output directories such as `./out`.

## kordoc

Use for reading and conversion:

```bash
npx --yes --package kordoc --package pdfjs-dist kordoc ./input.hwp --format json > ./out/input.json
npx --yes --package kordoc --package pdfjs-dist kordoc ./input.hwpx -o ./out/input.md
npx --yes --package kordoc --package pdfjs-dist kordoc ./docs/* -d ./out
```

Expected JSON fields usually include `success`, `markdown`, `blocks`, and `metadata`. Inspect `blocks` for table/image/control records instead of relying only on Markdown.

## k-skill-rhwp

Use for HWP edits:

```bash
npx --yes k-skill-rhwp info ./input.hwp
npx --yes k-skill-rhwp search ./input.hwp --query "target"
npx --yes k-skill-rhwp replace-all ./input.hwp ./out/edited.hwp --query "old" --replacement "new"
npx --yes k-skill-rhwp insert-text ./input.hwp ./out/edited.hwp --section 0 --paragraph 0 --offset 0 --text "text"
npx --yes k-skill-rhwp delete-text ./input.hwp ./out/edited.hwp --section 0 --paragraph 0 --offset 0 --length 4
npx --yes k-skill-rhwp create-table ./input.hwp ./out/table.hwp --section 0 --paragraph 1 --offset 0 --rows 2 --cols 3
npx --yes k-skill-rhwp set-cell-text ./input.hwp ./out/cell.hwp --section 0 --parent-paragraph 1 --control 0 --cell 0 --text "value"
```

Failure patterns:

- Coordinate errors mean the section, paragraph, control, cell, or offset must be rechecked with `info` or `search`.
- HWPX input can generally be read, but editing output should be treated as HWP.
- Complex charts, embedded objects, and protected documents may need manual review or upstream `rhwp`.

## rhwp

Use only for advanced diagnostics:

```bash
rhwp info ./input.hwp
rhwp export-svg ./input.hwp -o ./out/svg -p 0 --debug-overlay
rhwp dump-pages ./input.hwp -p 0
rhwp ir-diff ./before.hwp ./after.hwp
rhwp thumbnail ./input.hwp -o ./out/thumb.png
rhwp convert ./locked.hwp ./out/unlocked.hwp
```

If `rhwp` is missing, install from upstream releases or with Cargo where available.
