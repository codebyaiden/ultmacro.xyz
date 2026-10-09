# ActivateRaiseTheDead command

> Presses the Raise the Dead keybind, which revives the Necromancer skeletons.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-activateraisethedead
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: ActivateRaiseTheDead([wait])

Presses the Raise the Dead keybind, which revives the Necromancer skeletons.

## Parameters

| Setting | Value |
| --- | --- |
| wait | Optional milliseconds to wait before pressing it. Default 0, and it is skipped while recording. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
ActivateRaiseTheDead()
ActivateRaiseTheDead(2500)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
