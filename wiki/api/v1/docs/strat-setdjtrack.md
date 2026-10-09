# SetDJTrack command

> Selects a track on the DJ Booth. The strategy has to place a tower with the id DJ first.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-setdjtrack
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: SetDJTrack("track")

Selects a track on the DJ Booth. The strategy has to place a tower with the id DJ first.

## Parameters

| Setting | Value |
| --- | --- |
| track | green, purple or red, in quotes. The macro matches the track by its colour icon, so any other value is refused at runtime. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
SetDJTrack("green")
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
