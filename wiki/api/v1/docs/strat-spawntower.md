# SpawnTower command

> Places a tower from the hotbar on the map and gives it an id. Every later command that touches this tower refers to it by that id.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-spawntower
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: SpawnTower(x, y, slot, towerID)

Places a tower from the hotbar on the map and gives it an id. Every later command that touches this tower refers to it by that id.

This is the line the visual editor rewrites when a marker is dragged, so its x and y stay in sync with the map view.

## Parameters

| Setting | Value |
| --- | --- |
| x | Horizontal position in pixels, measured from the left edge of the Roblox client at the resolution in [DO NOT EDIT]. |
| y | Vertical position in pixels, measured from the top edge. |
| slot | Hotbar slot, 1 to 5. Slot n is the n-th tower in requiredTowers. |
| towerID | A name of your choice, such as Mini1 or dj. It has to be unique in the file. UpgradeTower, SellTower, ChangeTargets, CloneTower and BrawlerReposition all take this id. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
SpawnTower(1063, 528, 1, Mini1)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
