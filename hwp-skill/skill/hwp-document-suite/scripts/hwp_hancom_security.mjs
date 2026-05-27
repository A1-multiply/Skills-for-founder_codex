import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_NAMES = ["FilePathCheckerModuleExample", "FilePathCheckerModule"];

export function hancomSecurityPowerShell(metaUrl) {
  const scriptDir = path.dirname(fileURLToPath(metaUrl));
  const dllPath = path.resolve(
    scriptDir,
    "..",
    "vendor",
    "hancom-automation-security",
    "FilePathCheckerModuleExample.dll"
  );

  return `
$securityDllPath = ${quotePowerShellString(dllPath)}
if (-not (Test-Path -LiteralPath $securityDllPath)) {
  throw "Hancom automation security module is missing: $securityDllPath"
}
$securityModuleNames = @(${MODULE_NAMES.map(quotePowerShellString).join(", ")})
$securityRegistryPaths = @(
  'Registry::HKEY_CURRENT_USER\\SOFTWARE\\HNC\\HwpAutomation\\Modules',
  'Registry::HKEY_CURRENT_USER\\SOFTWARE\\WOW6432Node\\HNC\\HwpAutomation\\Modules'
)
$securityConfigured = $false
foreach ($securityRegistryPath in $securityRegistryPaths) {
  if (Test-Path -LiteralPath $securityRegistryPath) {
    foreach ($securityModuleName in $securityModuleNames) {
      $property = Get-ItemProperty -Path $securityRegistryPath -Name $securityModuleName -ErrorAction SilentlyContinue
      if ($null -ne $property -and $property.$securityModuleName -eq $securityDllPath) {
        $securityConfigured = $true
      }
    }
  }
}
if (-not $securityConfigured) {
  throw "Hancom automation security module is not configured. Run scripts/hwp_hancom_setup.mjs once, approving Hancom automation permissions, then retry."
}
$securityRegistered = $false
foreach ($securityModuleName in $securityModuleNames) {
  try {
    if ($hwp.RegisterModule('FilePathCheckDLL', $securityModuleName)) {
      $securityRegistered = $true
      break
    }
  } catch {}
}
if (-not $securityRegistered) {
  throw "Hancom automation security module registration failed."
}
`;
}

export function hancomSetupPowerShell(metaUrl) {
  const scriptDir = path.dirname(fileURLToPath(metaUrl));
  const dllPath = path.resolve(
    scriptDir,
    "..",
    "vendor",
    "hancom-automation-security",
    "FilePathCheckerModuleExample.dll"
  );

  return `
$securityDllPath = ${quotePowerShellString(dllPath)}
if (-not (Test-Path -LiteralPath $securityDllPath)) {
  throw "Hancom automation security module is missing: $securityDllPath"
}
$securityModuleNames = @(${MODULE_NAMES.map(quotePowerShellString).join(", ")})
$securityRegistryPaths = @(
  'Registry::HKEY_CURRENT_USER\\SOFTWARE\\HNC\\HwpAutomation\\Modules',
  'Registry::HKEY_CURRENT_USER\\SOFTWARE\\WOW6432Node\\HNC\\HwpAutomation\\Modules'
)
foreach ($securityRegistryPath in $securityRegistryPaths) {
  if (-not (Test-Path -LiteralPath $securityRegistryPath)) {
    New-Item -Path $securityRegistryPath -Force | Out-Null
  }
  foreach ($securityModuleName in $securityModuleNames) {
    New-ItemProperty -Path $securityRegistryPath -Name $securityModuleName -Value $securityDllPath -PropertyType String -Force | Out-Null
  }
}
`;
}

export function hancomPreflightPowerShell(metaUrl) {
  const scriptDir = path.dirname(fileURLToPath(metaUrl));
  const dllPath = path.resolve(
    scriptDir,
    "..",
    "vendor",
    "hancom-automation-security",
    "FilePathCheckerModuleExample.dll"
  );

  return `
$securityDllPath = ${quotePowerShellString(dllPath)}
if (-not (Test-Path -LiteralPath $securityDllPath)) {
  throw "Hancom automation security module is missing: $securityDllPath"
}
$securityModuleNames = @(${MODULE_NAMES.map(quotePowerShellString).join(", ")})
$securityRegistryPaths = @(
  'Registry::HKEY_CURRENT_USER\\SOFTWARE\\HNC\\HwpAutomation\\Modules',
  'Registry::HKEY_CURRENT_USER\\SOFTWARE\\WOW6432Node\\HNC\\HwpAutomation\\Modules'
)
$securityConfigured = $false
foreach ($securityRegistryPath in $securityRegistryPaths) {
  if (Test-Path -LiteralPath $securityRegistryPath) {
    foreach ($securityModuleName in $securityModuleNames) {
      $property = Get-ItemProperty -Path $securityRegistryPath -Name $securityModuleName -ErrorAction SilentlyContinue
      if ($null -ne $property -and $property.$securityModuleName -eq $securityDllPath) {
        $securityConfigured = $true
      }
    }
  }
}
if (-not $securityConfigured) {
  throw "Hancom automation security module is not configured. Run scripts/hwp_hancom_setup.mjs once, approving Hancom automation permissions, then retry."
}
`;
}

export function hancomRequireNoExistingHwpPowerShell() {
  return `
$existingHwp = @(Get-Process Hwp -ErrorAction SilentlyContinue)
if ($existingHwp.Count -gt 0) {
  throw "Existing Hwp.exe process detected before automation. Close Hancom and rerun to prevent file-access security dialogs."
}
`;
}

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
