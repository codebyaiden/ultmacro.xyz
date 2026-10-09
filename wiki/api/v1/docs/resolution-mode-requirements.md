# Adaptive display versus Legacy Mode

> Know when a supported 16:9 resolution is enough and when 1080p is required.

Status: published
Version: v1.3.5
Category: Setup & settings
Article: https://ultmacro.xyz/wiki/?article=resolution-mode-requirements
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk

## Display expectations

Release v1.3.5 supports adaptive image detection across supported 16:9 resolutions, but Legacy Mode specifically requires 1920×1080.

| Setting | Value |
| --- | --- |
| Adaptive detection | Supported 16:9 resolutions |
| Legacy Mode | 1920×1080 only |
| Troubleshooting baseline | 1920×1080 at 100% scaling |

## Coordinate mismatch check

1. Check Windows display resolution and scaling.
2. Check the Roblox window size and that it has not moved.
3. Confirm whether Legacy Mode is enabled.
4. Try a first-match placement test before changing timing delays.
