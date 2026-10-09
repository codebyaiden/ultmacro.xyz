# Back up your setup

> Export or import settings, hotkeys and strategies with Profile Manager.

Status: published
Version: v1.3.5
Category: Sessions & tools
Article: https://ultmacro.xyz/wiki/?article=profiles
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk

## Export before changing your setup

Profile Manager bundles settings, hotkeys and strategies for backup or moving to another PC. Export a working configuration before experimenting.

## Import with care

Check the import preview before replacing existing settings, hotkeys or strategies.

## Reinstall without losing strategies

In the public v1.3.5 macro, recordings, profiles, and bundled strategy files are stored in different locations. Copy your files before replacing a release folder; a reinstall alone is not a backup.

1. Export the working setup through Profile Manager and save the exported file outside the macro folder.
2. Press Win + R and open %APPDATA%\Ultimate_Macro. Copy the Recordings and Profiles folders to a separate backup location if present.
3. If you edited a bundled strategy, copy it from the extracted macro folder's Resources\Strats directory.
4. Verify your backups before removing or replacing anything. Keep bot credentials and webhook URLs private.
5. After reinstalling, restore only the intended files or import the saved profile, then test one strategy under supervision.
