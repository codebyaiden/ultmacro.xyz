# Commander command

> Tells the macro a Commander is in the loadout so it handles the Call of Arms ability during the run. The recorder adds this line by itself when it sees a Commander.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-commander
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: Commander := true

Tells the macro a Commander is in the loadout so it handles the Call of Arms ability during the run. The recorder adds this line by itself when it sees a Commander.

## Parameters

This command has no parameters.

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
Commander := true
~~~

## Before replay

Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map.
