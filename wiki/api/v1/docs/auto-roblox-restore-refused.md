# Auto Configure refuses to restore Roblox settings

> Investigate the mismatch without destroying the original backup.

Status: published
Version: v1.3.5 source inspection
Category: Troubleshooting
Article: https://ultmacro.xyz/wiki/?article=auto-roblox-restore-refused
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/auto_settings.ahk

## Why the restore can stop

The restore path validates the original backup and metadata. It can refuse restoration when the current XML no longer matches the verified backup or macro-applied state.

| Setting | Value |
| --- | --- |
| Expected safety behavior | Refuse uncertain file replacement |
| Do not do | Delete metadata or overwrite XML to bypass verification |

## Safest diagnosis

1. Stop Roblox and the macro.
2. Preserve the XML and .macro_bak files.
3. Read the .macro_error.log file for the exact mismatch.
4. Include that message in a report; wait for a verified recovery procedure before forcing a replacement.
