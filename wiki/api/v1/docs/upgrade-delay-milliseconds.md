# What Upgrade Delay means

> Why lowering the delay may cause skipped upgrades or wrong paths.

Status: published
Version: v1.3.5
Category: Setup & settings
Article: https://ultmacro.xyz/wiki/?article=upgrade-delay-milliseconds
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk

## Exact behavior

The v1.3.5 tooltip defines Upgrade Delay as the wait, in milliseconds, between two upgrade presses on the same tower.

| Setting | Value |
| --- | --- |
| Unit | Milliseconds |
| Reset default | 200 ms |
| Too low | May skip upgrades or land on the wrong path if the game cannot keep up |

## Safe tuning

1. Record the current Upgrade Delay value before changing it.
2. Increase it slightly if repeated upgrades are missed on a slower game.
3. Replay the same strategy and verify the upgrade path.
4. Only keep the change if the missed-action rate improves.
