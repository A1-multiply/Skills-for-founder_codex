#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$repo_root/skill/hwp-document-suite"

if [[ ! -d "$source_dir" ]]; then
  echo "Skill folder not found: $source_dir" >&2
  exit 1
fi

codex_home="${CODEX_HOME:-$HOME/.codex}"
skills_dir="$codex_home/skills"
target="$skills_dir/A1-HWP-SKILL"

mkdir -p "$skills_dir"
rm -rf "$target"
cp -R "$source_dir" "$target"

echo "Installed A1-HWP-SKILL to $target"
