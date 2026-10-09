# All .strat [Info] keys

> Optional description shown on the strategy card inside the macro. Nothing here changes how the run is played, so it is safe to edit freely.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-info-keys
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: [Info] key = value

Optional description shown on the strategy card inside the macro. Nothing here changes how the run is played, so it is safe to edit freely.

## Parameters

| Setting | Value |
| --- | --- |
| title | Name shown on the card. Defaults to the file name. |
| author | Who made the strategy. Defaults to You for local recordings. |
| desc | One or two lines describing the strategy or what it needs. |
| time | Roughly how long a run takes, for example 6-7 minutes. |
| income | What a run pays out, for example up to 5,000 coins per hour. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
[Info]
title=Coin + Any Tower EXP Farm
author=gall
desc=Modifiers recommended, timescale optional.
income=up to 5,000 coins per hour
time=6-7 minutes
~~~
