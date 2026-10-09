# EnforcerReposition command

> Uses the Helicopter Reposition ability of a top path Enforcer to carry another placed tower to a new spot.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-enforcerreposition
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: EnforcerReposition(enforcerID, towerID, x, y)

Uses the Helicopter Reposition ability of a top path Enforcer to carry another placed tower to a new spot.

## Parameters

| Setting | Value |
| --- | --- |
| enforcerID | The Enforcer running the ability, by the id used in SpawnTower. It has to be top path level 5 or higher. |
| towerID | The tower being carried, by the id used in SpawnTower. |
| x | New horizontal position of the carried tower, in the same pixel space as SpawnTower. |
| y | New vertical position of the carried tower. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
EnforcerReposition(Enf1, Mini1, 1024, 512)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
