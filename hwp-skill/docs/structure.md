# Package Structure

```text
hwp-skill/
  README.md
  install.ps1
  install.sh
  LICENSE
  skill/
    hwp-document-suite/
      SKILL.md
      agents/
        openai.yaml
      references/
        tooling.md
      scripts/
        hwp_inspect.mjs
        hwp_edit.mjs
  docs/
    usage.md
    structure.md
  examples/
    prompts.md
  tools/
    commands.md
```

## Folders

- `skill/`: the actual Codex skill folder to install.
- `docs/`: human-readable documentation.
- `examples/`: prompts users can copy into Codex.
- `tools/`: command reference for direct CLI use.

## Skill Folder

Codex discovers a skill through `SKILL.md`. Keep the actual skill folder name as:

```text
hwp-document-suite
```

Install target:

```text
~/.codex/skills/hwp-document-suite
```
