# Auto Configure: actual Roblox settings

> A source-backed reference for the Roblox values applied by Auto Configure.

Status: published
Version: v1.3.5 source inspection
Category: Setup & settings
Article: https://ultmacro.xyz/wiki/?article=auto-roblox-settings-reference
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/auto_settings.ahk

## Settings applied by source

The feature writes selected named fields in Roblox's GlobalBasicSettings_13.xml. These are not arbitrary performance recommendations; they are the values encoded in v1.3.5.

| Setting | Value |
| --- | --- |
| FramerateCap | 60 |
| Fullscreen | false |
| UiNavigationKeyBindEnabled | true |
| GraphicsQualityLevel | 1 |
| CameraMode | 0 |
| ChatVisible | false |
| PlayerListVisible | false |
| PerformanceStatsVisible | true |

## Avoid overriding by hand

The macro stores a backup and provenance metadata to restore the previous state safely. Hand-editing the XML while Auto Configure is active can interfere with that restoration.
