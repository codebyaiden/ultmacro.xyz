# How TimeScale is represented in macro settings

> Identify the setting used for accelerated matches.

Status: published
Version: v1.3.5 source inspection
Category: Sessions & tools
Article: https://ultmacro.xyz/wiki/?article=timescale-source-reference
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/Profiles.ahk

## Implementation names

Profile Manager exports TimeScaleMode, and the official README lists 1.5x and 2x TimeScale support.

| Setting | Value |
| --- | --- |
| Profile field | TimeScaleMode |
| Game behavior | Requires the relevant ticket/prompt to be available |

## Supervised validation

1. Check whether tickets are available in TDS.
2. Select the supported speed in macro settings.
3. Start a short supervised run.
4. Confirm gameplay actually changes speed and the strategy still completes.
5. Return to standard speed if timing or prompts cause failure.
