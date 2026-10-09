# Sleep command

> Waits before running the next step. This is how a strategy lines up with the waves.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-sleep
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: Sleep(ms)

Waits before running the next step. This is how a strategy lines up with the waves.

## Parameters

| Setting | Value |
| --- | --- |
| ms | Milliseconds to wait. 1000 is one second. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
Sleep(12000)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
