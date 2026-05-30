#!/usr/bin/env node
import { execFile } from "node:child_process";
import { hancomPreflightPowerShell, hancomSetupPowerShell } from "./hwp_hancom_security.mjs";

const args = process.argv.slice(2);
const allowExistingHwp = args.includes("--allow-existing-hwp");
const setup = args.includes("--setup");

function usage() {
  console.log(`Usage:
  node hwp_hancom_preflight.mjs [--allow-existing-hwp]
  node hwp_hancom_preflight.mjs --setup

Purpose:
  Checks that the Hancom automation security module was configured by setup.
  Use --setup or scripts/hwp_hancom_setup.mjs once to write the HKCU registry
  entries intentionally.
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
${setup ? hancomSetupPowerShell(import.meta.url) : hancomPreflightPowerShell(import.meta.url)}
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
  setup = ${setup ? "$true" : "$false"}
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
