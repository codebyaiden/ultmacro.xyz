# Where Auto Configure saves its backup

> Locate the original XML backup, metadata, and error log.

Status: published
Version: v1.3.5 source inspection
Category: Setup & settings
Article: https://ultmacro.xyz/wiki/?article=auto-roblox-settings-backup
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/auto_settings.ahk

## File locations

| Setting | Value |
| --- | --- |
| Original | %LOCALAPPDATA%\Roblox\GlobalBasicSettings_13.xml |
| Backup | GlobalBasicSettings_13.xml.macro_bak |
| Metadata | GlobalBasicSettings_13.xml.macro_bak.meta |
| Error log | GlobalBasicSettings_13.xml.macro_error.log |

## Before investigating

1. Close Roblox before attempting a restore.
2. Make a copy of the XML, backup and metadata files.
3. Read the .macro_error.log text without exposing sensitive folder information.
4. Report the failure reason and installed macro version.
