$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $repoRoot "hwp-skill\skill\hwp-document-suite"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Skill folder not found: $source"
}

$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$skillsDir = Join-Path $codexHome "skills"
$target = Join-Path $skillsDir "hwp-document-suite"

New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
if (Test-Path -LiteralPath $target) {
  Remove-Item -Recurse -Force -LiteralPath $target
}
Copy-Item -Recurse -Force -LiteralPath $source -Destination $target

Write-Host "Installed hwp-document-suite to $target"
