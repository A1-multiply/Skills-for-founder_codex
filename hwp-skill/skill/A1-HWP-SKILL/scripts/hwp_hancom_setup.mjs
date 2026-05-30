#!/usr/bin/env node
import { execFile } from "node:child_process";
import { hancomSetupPowerShell } from "./hwp_hancom_security.mjs";

function usage() {
  console.log(`Usage:
  node scripts/hwp_hancom_setup.mjs

Purpose:
  One-time Hancom automation setup. Registers the bundled FilePathCheckDLL
  module in HKCU so later HWP COM tasks can open/save files without repeated
  registry writes or Hancom file-access warning dialogs.
`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

if (process.platform !== "win32") {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: "non-windows" }, null, 2));
  process.exit(0);
}

const script = `
$ErrorActionPreference = 'Stop'
${hancomSetupPowerShell(import.meta.url)}
$existing = @(Get-Process Hwp -ErrorAction SilentlyContinue)
if ($existing.Count -gt 0) {
  throw "Existing Hwp.exe process detected. Close Hancom first, then rerun setup."
}
$hwp = New-Object -ComObject HWPFrame.HwpObject
$hwp.SetMessageBoxMode(0x00020000) | Out-Null
$registered = $false
foreach ($securityModuleName in $securityModuleNames) {
  try {
    if ($hwp.RegisterModule('FilePathCheckDLL', $securityModuleName)) {
      $registered = $true
      break
    }
  } catch {}
}
$hwp.Quit()
if (-not $registered) {
  throw 'Hancom automation security module registration failed.'
}
Write-Output (@{
  ok = $true
  securityModuleConfigured = $true
  registryScope = 'HKCU'
  existingHwpCount = $existing.Count
} | ConvertTo-Json -Compress)
`;

execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024
}, (error, stdout, stderr) => {
  if (error) {
    process.stderr.write(stderr || error.message);
    process.exit(error.code || 1);
    return;
  }
  process.stdout.write(stdout);
});
