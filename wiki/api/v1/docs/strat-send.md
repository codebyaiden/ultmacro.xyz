# Send command

> Holds a keyboard key down for a set time, then releases it. This is what the input recorder writes for movement and ability keys.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-send
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: Send("key", hold:=ms)

Holds a keyboard key down for a set time, then releases it. This is what the input recorder writes for movement and ability keys.

## Parameters

| Setting | Value |
| --- | --- |
| key | The key name in quotes, for example "w" or "space". |
| hold | How long to hold it, in milliseconds. The hold:= part is required. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
Send("w", hold:=450)
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
