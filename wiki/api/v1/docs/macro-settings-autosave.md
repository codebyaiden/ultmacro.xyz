# When settings are saved

> Understand how the public macro persists configuration changes.

Status: published
Version: v1.3.5
Category: Setup & settings
Article: https://ultmacro.xyz/wiki/?article=macro-settings-autosave
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk

## Auto-save

The v1.3.5 source wires settings auto-save controls and writes settings to the Options folder in AppData.

## Verify a change

1. Change one non-sensitive setting in the macro UI.
2. Close and relaunch the macro normally.
3. Return to Settings and verify that the value persisted.
4. If not, inspect file permissions for %APPDATA%\Ultimate_Macro\Options and gather the exact error.
