# Anatomy of a .strat file

> A .strat file is plain text split into sections. [Settings] holds the run configuration, [DO NOT EDIT] stores the resolution the strategy was recorded at, and [Steps] holds one command per line, executed top to bottom. [Info] is optional and only describes the strategy in the macro list.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-file-layout
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: [Info] / [Settings] / [DO NOT EDIT] / [Steps]

A .strat file is plain text split into sections. [Settings] holds the run configuration, [DO NOT EDIT] stores the resolution the strategy was recorded at, and [Steps] holds one command per line, executed top to bottom. [Info] is optional and only describes the strategy in the macro list.

## Parameters

| Setting | Value |
| --- | --- |
| [Info] | Optional. Shown on the strategy card in the macro. See the Info keys entry below. |
| [Settings] | key = value lines. See the Settings keys entry below. |
| [DO NOT EDIT] | width and height of the Roblox client when the strategy was recorded. Every coordinate in [Steps] is scaled from these numbers, so changing them moves every placement. |
| [Steps] | The command list. Blank lines are ignored, and anything after a ; on a line is treated as a comment. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
[Settings]
map=Crossroads
difficulty=Molten
requiredTowers=Minigunner, Commander

[DO NOT EDIT]
width=1920
height=1080

[Steps]
Sleep(2000)
SpawnTower(960, 540, 1, Mini1)
~~~
