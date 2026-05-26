# Hancom Automation Security Module

This folder contains Hancom's HWP automation file-path approval DLL:

- `FilePathCheckerModuleExample.dll`

The HWP COM API shows a file-access warning dialog unless a file-path checker
module is registered under the current user's registry:

`HKCU\SOFTWARE\HNC\HwpAutomation\Modules`

The scripts in `../scripts/` register this DLL automatically before opening HWP
files through `HWPFrame.HwpObject`, then call:

`RegisterModule("FilePathCheckDLL", "FilePathCheckerModuleExample")`

This prevents the repeated "allow file access" dialog during normal automation.
