# Capture a Strategy Lab map in Sandbox

> Understand why capture needs an already-open Sandbox session.

Status: published
Version: v1.3.5 source inspection
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strategy-lab-sandbox-camera
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/calibration/sandbox_replay.ahk

## Precondition

The calibration helper is designed to operate inside an already-open TDS Sandbox match. It verifies the macro's camera and coordinate assumptions before attempting an exact replay.

1. Enter the intended map in Sandbox manually.
2. Open the Strategy Lab capture/calibration feature for that build.
3. Allow the helper to validate its camera alignment.
4. Save the resulting map capture if the tool confirms success.

## If calibration refuses

Do not force a replay on an incompatible map or resolution. Save the refusal message and version details for the developer.
