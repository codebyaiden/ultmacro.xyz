# Understand lobby and Ready-screen recovery

> What can happen when a session starts or resumes in an unexpected state.

Status: published
Version: v1.3.5 source inspection
Category: Sessions & tools
Article: https://ultmacro.xyz/wiki/?article=map-ready-recovery-source
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/README.md

## Supported behavior

The v1.3.5 release advertises automatic reconnect and game re-entry, with watchdog and action-confirmation improvements. Whether a particular unexpected dialog is recoverable depends on its actual screen state.

1. Run one complete match supervised.
2. Check the transition back to the lobby or Ready screen.
3. Watch which map and mode are selected on re-entry.
4. If the macro stalls, stop with F2 and capture the last visible state and logs.

## Don't assume universal recovery

Game UI updates, Roblox login prompts or a mismatched strategy may require a manual intervention even when automatic reconnect works normally.
