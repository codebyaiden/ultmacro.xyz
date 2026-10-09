# Where Ultimate Macro stores settings

> Find the Windows AppData files used by the public v1.3.5 macro.

Status: published
Version: v1.3.5
Category: Setup & settings
Article: https://ultmacro.xyz/wiki/?article=where-settings-are-saved
Source: https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk

## Options folder

The released Main.ahk sets the options directory to %APPDATA%\Ultimate_Macro\Options and reads its primary configuration from Settings.tds.

| Setting | Value |
| --- | --- |
| Macro settings | %APPDATA%\Ultimate_Macro\Options\Settings.tds |
| Discord bot settings | %APPDATA%\Ultimate_Macro\Options\Discord-Bot-Settings.ini |
| Runtime state | %APPDATA%\Ultimate_Macro\state.ini |

## Inspect without changing anything

1. Press Win + R, enter %APPDATA%\Ultimate_Macro and press Enter.
2. Open Options to locate Settings.tds.
3. Copy the file to a separate backup folder before inspecting or editing it.
4. Never share your bot settings file publicly; it can contain credentials.
