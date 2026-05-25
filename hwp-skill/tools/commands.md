# Command Cheat Sheet

Run commands from the `hwp-skill` folder.

## Inspect

```bash
node skill/hwp-document-suite/scripts/hwp_inspect.mjs ./sample.hwp --out-dir ./out
```

## Edit

```bash
node skill/hwp-document-suite/scripts/hwp_edit.mjs info ./sample.hwp
node skill/hwp-document-suite/scripts/hwp_edit.mjs search ./sample.hwp --query "2025"
node skill/hwp-document-suite/scripts/hwp_edit.mjs replace-all ./sample.hwp ./out/edited.hwp --query "2025" --replacement "2026"
```

## Underlying Tools

```bash
npx --yes --package kordoc --package pdfjs-dist kordoc ./sample.hwp --format json
npx --yes k-skill-rhwp info ./sample.hwp
npx --yes k-skill-rhwp search ./sample.hwp --query "target"
```
