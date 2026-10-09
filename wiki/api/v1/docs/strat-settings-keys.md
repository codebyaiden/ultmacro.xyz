# All .strat [Settings] keys

> The configuration the macro reads before a run starts. Unknown keys are ignored, and any key left out falls back to the default shown here.

Status: published
Version: v1.3.5 source reference
Category: Strategies
Article: https://ultmacro.xyz/wiki/?article=strat-settings-keys
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js

## What it does

Syntax: [Settings] key = value

The configuration the macro reads before a run starts. Unknown keys are ignored, and any key left out falls back to the default shown here.

## Parameters

| Setting | Value |
| --- | --- |
| map | Map name exactly as TDS spells it, for example Crossroads. |
| difficulty | Casual, Easy, Intermediate, Molten, Fallen, Hardcore, Voidcore, or an Arcade / Trial name. |
| requiredTowers | Comma separated loadout in hotbar order. Prefix a tower with G for the golden version and R for the regular one, for example G Minigunner. Slot n in SpawnTower is the n-th tower here. |
| modifiers | Comma separated match modifiers to apply in the map menu. Leave empty for none. |
| autoChain | ON or OFF. Spams Call of Arms during the run. |
| autoCaravan | ON or OFF. Spams Support Caravan. |
| autoDropTheBeat | ON or OFF. Spams Drop the Beat. |
| autoSkip | ON or OFF, default ON. Presses the wave skip button when it appears. |
| abilitySpam | ON or OFF, default ON. Allows abilities to be used between steps. |
| moveEnabled | true or false. Walk after aligning the camera so the view is not blocked. |
| moveDirection | W, A, S or D. Which way to walk when moveEnabled is true. |
| moveDuration | How long to hold that key, in milliseconds. Default 750. |

## Example

This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing.

~~~text
requiredTowers=G Minigunner, Commander, DJ
modifiers=Fog
autoChain=ON
moveEnabled=true
moveDirection=S
moveDuration=750
~~~
