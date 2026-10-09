# Verify the official ZIP and checksum

> Compare the packaged release asset against its published SHA-256 digest.

Status: published
Version: v1.3.5 source inspection
Category: Start here
Article: https://ultmacro.xyz/wiki/?article=release-asset-integrity
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk

## Identify the release asset

The updater source checks the latest stable GitHub release and looks for a ZIP with the expected name and SHA-256 digest.

1. Open the official GitHub Releases page.
2. Choose the release matching your intended version.
3. Download the attached ZIP, not a file reposted by another account.
4. Check the digest associated with that specific release asset.

## Verify locally

Run this in PowerShell from the download folder and compare the hexadecimal result with the published digest.

| Setting | Value |
| --- | --- |
| Command | Get-FileHash -Algorithm SHA256 .\TDS.Macro.v1.3.5.zip |
| Pass condition | The hashes match exactly |

## When to stop

If the digest is missing or the hash differs, do not bypass verification with a random replacement archive.
