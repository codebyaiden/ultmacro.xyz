# BrawlerReposition command

> Moves a placed Brawler to a new spot using its reposition ability.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-brawlerreposition
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: BrawlerReposition(towerID, x, y)

Moves a placed Brawler to a new spot using its reposition ability.

## Parameters

| Setting | Value |
| --- | --- |
| towerID | The Brawler, by the id used in SpawnTower. |
| x | New horizontal position, in the same pixel space as SpawnTower. |
| y | New vertical position. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
BrawlerReposition(Brawler1, 992, 604)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
