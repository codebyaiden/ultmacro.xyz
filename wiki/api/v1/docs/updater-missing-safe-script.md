# Updater cannot find safe_update.ps1

> Identify an incomplete extracted package before attempting an update.

Status: published
Version: v1.3.5 source inspection
Category: Troubleshooting
Article: https://ultmacro.xyz/wiki/?article=updater-missing-safe-script
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk

## Source check

The updater explicitly looks for submacros\safe_update.ps1. If missing, it displays an Update Error and stops without changing the installation.

| Setting | Value |
| --- | --- |
| Expected file | <extracted release>\submacros\safe_update.ps1 |
| Typical cause | Incomplete extraction or moving Main.ahk by itself |

## Fix without bypassing checks

1. Stop Ultimate Macro.
2. Download the complete official ZIP.
3. Extract it as a whole into a clean folder.
4. Confirm submacros\safe_update.ps1 exists.
5. Back up existing .strat files before switching to the clean folder.
