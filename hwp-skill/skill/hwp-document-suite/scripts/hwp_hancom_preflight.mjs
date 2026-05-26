#!/usr/bin/env node
import { execFile } from "node:child_process";
import { hancomPreflightPowerShell } from "./hwp_hancom_security.mjs";

const args = process.argv.slice(2);
const allowExistingHwp = args.includes("--allow-existing-hwp");

function usage() {
  console.log(`Usage:
  node hwp_hancom_preflight.mjs [--allow-existing-hwp]

Purpose:
  Registers the Hancom automation security module before any HWP COM open/save
  operation, and fails early if an existing Hwp.exe process may already be stuck
  on a security dialog.
`);
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

if (process.platform !== "win32") {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: "non-windows" }, null, 2));
  process.exit(0);
}

const script = `
$ErrorActionPreference = 'Stop'
${hancomPreflightPowerShell(import.meta.url)}
$existing = @(Get-Process Hwp -ErrorAction SilentlyContinue)
if ($existing.Count -gt 0 -and -not ${allowExistingHwp ? "$true" : "$false"}) {
  throw "Existing Hwp.exe process detected. Close Hancom first, or rerun with --allow-existing-hwp if you intentionally want to reuse it."
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
  securityModuleRegistered = $true
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
