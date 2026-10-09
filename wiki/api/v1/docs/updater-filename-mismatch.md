# Updater doesn't recognize the newest release ZIP

> The v1.3.5 updater expects a filename that differs from its published ZIP asset.

Status: published
Version: v1.3.5 source inspection
Category: Troubleshooting
Article: https://ultmacro.xyz/wiki/?article=updater-filename-mismatch
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk

## Confirmed source versus release

The v1.3.5 updater sets PreferredAsset to TDS_Macro.zip, while the published v1.3.5 asset is named TDS.Macro.v1.3.5.zip. The exact-name comparison can prevent this updater implementation from finding that release asset.

| Setting | Value |
| --- | --- |
| Expected by code | TDS_Macro.zip |
| Published v1.3.5 ZIP | TDS.Macro.v1.3.5.zip |
| Symptom | Update check may silently return without offering an update |

## What users should do

1. Check which version is installed; if it is already v1.3.5, there is no newer stable v1.3.5 update to install.
2. Visit official GitHub Releases and verify whether a newer stable tag exists.
3. If updating manually, use the official asset and preserve your strategies and settings.
4. Report the filename mismatch to maintainers so the updater can be fixed in a release.

## Do not workaround by

Do not rename or spoof a GitHub release asset locally to force the updater or disable its integrity validation.
