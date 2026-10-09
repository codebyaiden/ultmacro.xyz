# SellTower command

> Sells a placed tower and frees its spot. The id stops being usable by later commands.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-selltower
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: SellTower(towerID)

Sells a placed tower and frees its spot. The id stops being usable by later commands.

## Parameters

| Setting | Value |
| --- | --- |
| towerID | The id used in SpawnTower. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
SellTower(Scout1)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
