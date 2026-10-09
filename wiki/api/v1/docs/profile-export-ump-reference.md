# What's inside an exported .ump profile

> Review metadata, strategy contents, option groups and privacy.

Status: published
Version: v1.3.5 source inspection
Category: Sessions & tools
Article: https://ultmacro.xyz/wiki/?article=profile-export-ump-reference
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/Profiles.ahk

## Profile format

The source writes an UTF-8 JSON-based .ump file containing export metadata, selected settings groups and optional strategy file contents.

| Setting | Value |
| --- | --- |
| Extension | .ump |
| Metadata | macroVersion, createdAt, name, description |
| Optional groups | Options, Hotkeys, RecordingHotkeys |
| Strategy entries | File names and text contents for selected strategy paths |

## Before sharing

The export may contain sensitive configuration, and included strategy files may be private. Prefer a redacted log excerpt over sharing your whole profile to public support.
