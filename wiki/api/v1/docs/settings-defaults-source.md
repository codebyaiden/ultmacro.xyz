# Understand saved option defaults

> See the settings used when a value is absent from the macro's INI file.

Status: published
Version: v1.3.5 source inspection
Category: Setup & settings
Article: https://ultmacro.xyz/wiki/?article=settings-defaults-source
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk

## Read-time defaults

The v1.3.5 macro reads settings from an INI file and supplies fallbacks. Saved user settings override these defaults.

| Setting | Value |
| --- | --- |
| AutoEquip | Off (0) |
| UseRestartBtn | On (1) |
| UsePlayAgainBtn | On (1) |
| CheckTheMap | On (1) |
| RotateStrategies | Off (0) |

## When defaults don't match

A previously saved value can differ from a default. Review Settings and the underlying INI before assuming the program ignored the user.
