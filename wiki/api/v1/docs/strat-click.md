# Click command

> Clicks a point on screen. Useful for buttons the other commands do not cover.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-click
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: Click(x, y [, Right])

Clicks a point on screen. Useful for buttons the other commands do not cover.

## Parameters

| Setting | Value |
| --- | --- |
| x | Horizontal position, in the same pixel space as SpawnTower. |
| y | Vertical position. |
| Right | Optional. Add Right for a right click, anything else is a left click. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
Click(960, 540)
Click(960, 540, Right)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
