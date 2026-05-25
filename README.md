# HWP Document Suite Skill

Codex skill for reading, understanding, and editing Korean Hangul Office documents (`.hwp`, `.hwpx`, `.hwpml`).

## What It Does

- Reads HWP/HWPX/HWPML contents into Markdown and JSON.
- Summarizes document structure, headings, tables, images, controls, and metadata.
- Supports safe HWP edits through separate output files.
- Provides wrappers around `kordoc`, `k-skill-rhwp`, and optional upstream `rhwp`.

## Install

Clone this repository, then copy the skill into your Codex skills directory:

```powershell
git clone <this-repo-url>
cd A1-hwp-skill
.\install.ps1
```

On macOS/Linux:

```bash
git clone <this-repo-url>
cd A1-hwp-skill
./install.sh
```

Manual install is also simple: copy `hwp-document-suite/` into `~/.codex/skills/`.

## Requirements

- Node.js 18+
- Internet access the first time `npx` downloads packages
- Optional: Rust/Cargo or a release binary for upstream `rhwp` if you need advanced layout diagnostics

## Example Prompts

- "이 HWP 파일 전체 내용과 표 구조를 읽고 요약해줘."
- "이 HWPX 문서를 JSON으로 뽑아서 섹션, 표, 이미지가 어떻게 구성됐는지 알려줘."
- "문서 안의 2025를 2026으로 바꾼 새 HWP 파일을 만들어줘."
- "표 첫 번째 셀 내용을 합계로 수정해줘."

## Direct Script Use

```bash
node hwp-document-suite/scripts/hwp_inspect.mjs ./sample.hwp --out-dir ./out
node hwp-document-suite/scripts/hwp_edit.mjs info ./sample.hwp
node hwp-document-suite/scripts/hwp_edit.mjs replace-all ./sample.hwp ./out/edited.hwp --query 2025 --replacement 2026
```

Outputs are written separately so the original document is preserved.
