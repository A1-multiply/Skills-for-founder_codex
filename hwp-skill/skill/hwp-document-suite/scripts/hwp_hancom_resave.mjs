#!/usr/bin/env node
import { execFile } from "node:child_process";
import path from "node:path";
import { hancomRequireNoExistingHwpPowerShell, hancomSecurityPowerShell } from "./hwp_hancom_security.mjs";

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  node hwp_hancom_resave.mjs <input.hwp> <output.hwp>

Purpose:
  Re-saves a HWP through local Hancom Office on Windows so final files open without
  external-editor recovery/security warnings when Hancom COM is available.
`);
}

const input = args[0];
const output = args[1];

if (!input || !output || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(input || output ? 0 : 1);
}

if (process.platform !== "win32") {
  throw new Error("hwp_hancom_resave.mjs requires Windows with Hancom Office installed.");
}

await hancomResave(input, output);

function hancomResave(inputPath, outputPath) {
  const openFormat = path.extname(inputPath).toLowerCase() === ".hwpx" ? "HWPX" : "HWP";
  const script = `
$ErrorActionPreference = 'Stop'
$inputPath = ${quotePowerShellString(path.resolve(inputPath))}
$outputPath = ${quotePowerShellString(path.resolve(outputPath))}
$openFormat = ${quotePowerShellString(openFormat)}
${hancomRequireNoExistingHwpPowerShell()}
$hwp = New-Object -ComObject HWPFrame.HwpObject
$hwp.SetMessageBoxMode(0x00020000) | Out-Null
${hancomSecurityPowerShell(import.meta.url)}
$opened = $hwp.Open($inputPath, $openFormat, 'forceopen:true;readonly:false')
if (-not $opened) { throw 'Hancom HWP failed to open input file.' }
$hwp.SaveAs($outputPath, 'HWP', '') | Out-Null
$hwp.Quit()
Write-Output (@{ ok = $true; outputPath = $outputPath; method = 'hancom-com-resave' } | ConvertTo-Json -Compress)
`;

  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Hancom re-save failed: ${stderr || error.message}`));
        return;
      }
      process.stdout.write(stdout);
      resolve();
    });
  });
}

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
