# CloneTower command

> Uses the Hologram ability to place a copy of an existing tower at a new spot.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-clonetower
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: CloneTower(towerID, x, y [, wait])

Uses the Hologram ability to place a copy of an existing tower at a new spot.

## Parameters

| Setting | Value |
| --- | --- |
| towerID | The tower to copy, by the id used in SpawnTower. |
| x | Horizontal position of the clone, in the same pixel space as SpawnTower. |
| y | Vertical position of the clone. |
| wait | Optional milliseconds to wait before cloning. Default 0, and it is skipped while recording. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
CloneTower(Mini1, 1180, 553)
CloneTower(Mini1, 1180, 553, 4000)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
