# Know whether a release is stable or prerelease

> Read Github's stable release feed as the macro updater does.

Status: published
Version: v1.3.5 source inspection
Category: Start here
Article: https://ultmacro.xyz/wiki/?article=release-prereleases
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk

## The source endpoint

The v1.3.5 updater calls GitHub's /releases/latest endpoint, which selects the latest stable published release rather than unreleased tester builds.

| Setting | Value |
| --- | --- |
| Stable releases | Look for the public release tag and a ZIP asset |
| Tester/prerelease | Follow explicit tester instructions; don't assume the updater uses it |

## Before switching builds

1. Check release date, version tag and published channel.
2. Preserve the current .strat files and profile export.
3. Read the release notes for settings or compatibility changes.
4. Do a supervised test run after switching builds.
