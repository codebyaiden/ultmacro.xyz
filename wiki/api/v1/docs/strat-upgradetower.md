# UpgradeTower command

> Buys upgrades for a tower that is already placed. The macro opens the tower panel, waits until the upgrade is affordable and confirms each one.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-upgradetower
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: UpgradeTower(towerID [, skipOpen] [, amount] [, path] [, pathLevel])

Buys upgrades for a tower that is already placed. The macro opens the tower panel, waits until the upgrade is affordable and confirms each one.

## Parameters

| Setting | Value |
| --- | --- |
| towerID | The id used in SpawnTower. |
| skipOpen | true or false, default false. Pass true when the tower panel is already open so the macro does not click the tower again. |
| amount | How many upgrades to buy in a row. Default 1. |
| path | Which upgrade path to take on a branching tower. Default 0, the top path. Only needed for towers that branch. |
| pathLevel | The level at which the tower branches. Default 0. Used together with path so the macro knows when the choice appears. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
UpgradeTower(Mini1)
UpgradeTower(Mini1, false, 4)
UpgradeTower(Ace1, false, 1, 2, 3)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
