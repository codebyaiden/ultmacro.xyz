# What safe update verifies before installing

> Understand downloaded staging files, checksums and rollback support.

Status: published
Version: v1.3.5 source inspection
Category: Sessions & tools
Article: https://ultmacro.xyz/wiki/?article=safe-update-validation
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/safe_update.ps1

## The update sequence

The updater downloads a release to staging, compares its SHA-256 with the release digest and validates the archive before replacing existing files. Backup and rollback logic are in the release package.

| Setting | Value |
| --- | --- |
| Before updating | Working version and custom strategies should remain backed up |
| Verification | SHA-256 and package structure checks |
| Recovery | Existing backup/rollback path rather than unchecked overwrite |

## When the update fails

1. Leave the current installation folder intact.
2. Save the full error message.
3. Determine whether the download, checksum or extracted-file validation failed.
4. Retry only after the asset issue is resolved.
