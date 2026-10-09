# ChangeTargets command

> Opens the tower panel and cycles its targeting until it matches the target asked for.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-changetargets
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: ChangeTargets(towerID, target)

Opens the tower panel and cycles its targeting until it matches the target asked for.

## Parameters

| Setting | Value |
| --- | --- |
| towerID | The tower, by the id used in SpawnTower. |
| target | One of First Enemy, Last Enemy, Strongest, Weakest, Closest, Farthest or Random. Written without quotes. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
ChangeTargets(Mini1, Strongest)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
