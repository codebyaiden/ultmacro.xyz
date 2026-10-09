# Start and stop keys in the installed macro

> Confirm the F1/F2 bindings and what they call.

Status: published
Version: v1.3.5 source inspection
Category: Start here
Article: https://ultmacro.xyz/wiki/?article=launch-stop-source
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk

## Source behavior

Main.ahk binds F1 to StartStrategy and F2 to StopStrategy. The implementation uses pass-through hotkeys, so the keys can also reach another focused application.

| Setting | Value |
| --- | --- |
| F1 | StartStrategy |
| F2 | StopStrategy |

## When stopping a stuck run

1. Press F2 once and allow cleanup to finish.
2. If Roblox remains active, check whether held inputs have actually been released.
3. Collect logs if the macro ignores the stop key or remains in a recovery loop.
