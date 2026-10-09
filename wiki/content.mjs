// Version-aware, hand-reviewed wiki seed. Add only verified guidance; avoid invented troubleshooting fixes.
export const categories = ["Getting started","Configuration","Strategies","Features","Troubleshooting","Discord & community"];
export const articles = [
  {
    "slug": "install",
    "category": "Getting started",
    "title": "Install Ultimate Macro",
    "summary": "Download, extract, install AutoHotkey v2, and launch your first copy.",
    "sections": [
      {
        "title": "Before downloading",
        "paragraphs": [
          "Ultimate Macro is a Windows application for Roblox Tower Defense Simulator. Use only the official download page or GitHub release assets."
        ],
        "steps": [],
        "checks": [
          "Windows 10 or 11",
          "A supported 16:9 display",
          "AutoHotkey v2.0 (64-bit)"
        ]
      },
      {
        "title": "Install in order",
        "paragraphs": [],
        "steps": [
          "Open the official Ultimate Macro download page and get the current release ZIP.",
          "Extract the entire archive into its own folder. Do not launch scripts from inside the ZIP.",
          "Install AutoHotkey v2.0 from the official AutoHotkey website. AutoHotkey v1.1 cannot run this project.",
          "Open Main.ahk from the extracted folder.",
          "Configure the display and game settings before starting a strategy."
        ],
        "checks": []
      },
      {
        "title": "If it does not open",
        "paragraphs": [
          "Confirm that .ahk files use the v2 launcher, that the complete archive was extracted, and that no Roblox multi-client utility is running. See the launch troubleshooting article."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "requirements",
    "category": "Getting started",
    "title": "System requirements",
    "summary": "Supported operating systems, AutoHotkey, resolution, and OCR requirements.",
    "sections": [
      {
        "title": "Required",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Windows 10 or 11",
          "64-bit AutoHotkey v2.0",
          "Supported 16:9 resolution from 1280×720 to 3840×2160",
          "English (US) Windows OCR language pack",
          "Visible Windows taskbar",
          "Roblox running as a normal single client"
        ]
      },
      {
        "title": "Recommended baseline",
        "paragraphs": [
          "1920×1080 resolution with Windows scaling at 100% is the recommended starting point. The macro has adaptive resolution support, but unusual display setups should be tested before unattended use.",
          "On slower PCs, Potato Mode and increased delays can help."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "first-run",
    "category": "Getting started",
    "title": "Your first run",
    "summary": "Set up a built-in strategy and test one complete match.",
    "sections": [
      {
        "title": "Start with a known strategy",
        "paragraphs": [],
        "steps": [
          "Launch Roblox and open Tower Defense Simulator.",
          "Open Ultimate Macro and choose a bundled strategy on the Main tab.",
          "Confirm the tower loadout matches the strategy requirements.",
          "Check game settings, keybinds, and window placement.",
          "Press Start or F1, then watch the entire first match.",
          "Use F2 to stop safely if anything goes wrong."
        ],
        "checks": []
      },
      {
        "title": "Before leaving it unattended",
        "paragraphs": [
          "Do not assume a successful launch means a strategy is stable. Check placement, upgrades, result detection, and transitions between matches."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "download-safely",
    "category": "Getting started",
    "title": "Official downloads and updates",
    "summary": "Where to download releases and what to avoid.",
    "sections": [
      {
        "title": "Trusted download sources",
        "paragraphs": [
          "Use the Ultimate Macro download page or the UltimateMacro/Ultimate-Macro-New-Era releases page. Do not trust reuploaded ZIPs from unrelated sites.",
          "Release pages include version notes. Check the version before following instructions for an older build."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Keep your files",
        "paragraphs": [
          "Before changing versions, back up your custom .strat files and important settings. Preserve the full release directory when extracting."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/download/"
  },
  {
    "slug": "windows-display",
    "category": "Configuration",
    "title": "Windows display settings",
    "summary": "Resolution, scaling, taskbar, and OCR settings that affect detection.",
    "sections": [
      {
        "title": "Configure Windows",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Use a supported 16:9 resolution; start with 1920×1080 when possible.",
          "Use 100% display scaling as the baseline.",
          "Keep the taskbar visible. Do not auto-hide it.",
          "Install the Windows English (US) OCR language pack.",
          "Avoid moving or resizing Roblox after the macro starts."
        ]
      },
      {
        "title": "Why this matters",
        "paragraphs": [
          "Ultimate Macro uses screen coordinates, image detection, and OCR. A different UI scale or an obscured taskbar can change what the macro sees."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "roblox-settings",
    "category": "Configuration",
    "title": "Roblox settings",
    "summary": "Set Roblox up for predictable macro input and image detection.",
    "sections": [
      {
        "title": "Recommended settings",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Maximum Frame Rate: 60 FPS",
          "Camera Mode: Classic",
          "Graphics Mode: Manual",
          "UI Navigation Toggle: Enabled"
        ]
      },
      {
        "title": "Keep the picture stable",
        "paragraphs": [
          "Do not use custom Roblox font modifications. They can break text recognition. Use a consistent window position and size while the macro is running."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "tds-settings",
    "category": "Configuration",
    "title": "Tower Defense Simulator settings",
    "summary": "The required in-game UI layout and accessibility settings.",
    "sections": [
      {
        "title": "Recommended TDS settings",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "UI Scale: Large",
          "Screen Shake: Disabled",
          "Prefer Vertical Upgrades: Enabled",
          "Dialog: Disabled",
          "Show Tower Options: Enabled"
        ]
      },
      {
        "title": "After changing settings",
        "paragraphs": [
          "Restart a short supervised test run. Even a small UI change can make a recorded click or image match unreliable."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "hotkeys",
    "category": "Configuration",
    "title": "Keyboard shortcuts and keybinds",
    "summary": "Default playback and strategy-recording controls.",
    "sections": [
      {
        "title": "Playback",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "F1: start the macro",
          "F2: stop the macro and release held input"
        ]
      },
      {
        "title": "Recording defaults",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "F: place tower",
          "Ctrl + U: upgrade tower",
          "Ctrl + X: sell tower",
          "Ctrl + `: change target",
          "Ctrl + D: change DJ track",
          "Ctrl + T: align camera",
          "Ctrl + Alt + H: hologram tower",
          "Ctrl + B: delete last recorded action",
          "Ctrl + Shift + E: record inputs"
        ]
      },
      {
        "title": "Customize safely",
        "paragraphs": [
          "Recording shortcuts can be changed under Settings → Recording Hotkeys. Check for conflicts with your TDS keybinds before recording."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "record-strategy",
    "category": "Strategies",
    "title": "Record your first strategy",
    "summary": "Save your actions during a TDS match into a reusable .strat file.",
    "sections": [
      {
        "title": "Prepare",
        "paragraphs": [
          "Choose the right map, mode, loadout, and keybinds. Make sure Windows, Roblox, and TDS settings are correct first."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Record",
        "paragraphs": [],
        "steps": [
          "Open Create in Ultimate Macro.",
          "Choose Record a Strategy.",
          "Play the match normally, using the configured recording shortcuts for actions you want captured.",
          "Save the completed recording as a .strat file.",
          "Replay it while supervising a match to confirm it behaves correctly."
        ],
        "checks": []
      },
      {
        "title": "Improve reliability",
        "paragraphs": [
          "Record at a pace the macro can reproduce on slower machines. Verify money-dependent upgrades and placement timing."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "edit-strategy",
    "category": "Strategies",
    "title": "Edit strategies with Strategy Lab",
    "summary": "Inspect and refine a .strat without manually editing raw files.",
    "sections": [
      {
        "title": "Open the editor",
        "paragraphs": [
          "Choose Edit a Strategy or Open Strategy Lab from the Create tab. You can also launch StrategyLab.exe from the extracted release folder."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "What it is for",
        "paragraphs": [
          "Strategy Lab is a visual .strat editor for inspecting placements, ranges, paths, and other strategy actions. Preserve a copy of the original file while experimenting."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "strategy-rotation",
    "category": "Strategies",
    "title": "Strategy Rotation",
    "summary": "Run more than one strategy in a session.",
    "sections": [
      {
        "title": "When to use it",
        "paragraphs": [
          "Strategy Rotation can alternate between configured strategies across runs. Confirm that every selected strategy is compatible with the current mode and tower loadout."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Troubleshooting",
        "paragraphs": [
          "Test each strategy alone first. If individual strategies fail, rotation will not fix them."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "community-strategies",
    "category": "Strategies",
    "title": "Community strategies",
    "summary": "Find and use shared .strat files through Strategy Network.",
    "sections": [
      {
        "title": "Getting a strategy",
        "paragraphs": [
          "Browse Strategy Network for shared strategy files. Check their requirements, supported maps, modes, and loadouts before use."
        ],
        "steps": [
          "Open Strategy Network.",
          "Choose a strategy that matches your unlocked towers and target mode.",
          "Download or select it using the supported macro workflow.",
          "Watch its first complete run and stop with F2 if actions do not match."
        ],
        "checks": []
      },
      {
        "title": "Important",
        "paragraphs": [
          "A shared strategy is not proof of reliability on your own machine or after a game update."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/strategies/"
  },
  {
    "slug": "timescale",
    "category": "Features",
    "title": "Timescale support",
    "summary": "Use supported 1.5× and 2× timescale options.",
    "sections": [
      {
        "title": "Before use",
        "paragraphs": [
          "Ultimate Macro supports 1.5× and 2× timescale features in documented releases. Confirm that the selected strategy is suitable for the chosen speed.",
          "If timescale prompts, tickets, or confirmations cause stalls, return to a slower supervised test run and collect logs."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "goals",
    "category": "Features",
    "title": "Goals and longer sessions",
    "summary": "Configure longer-running sessions with clear stopping conditions.",
    "sections": [
      {
        "title": "What goals do",
        "paragraphs": [
          "The existing guide describes Goals as part of longer-session automation. Consult the version-specific settings in your installation before relying on any stopping condition."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Safe first test",
        "paragraphs": [
          "Start with a small goal you can observe. Verify that the macro stops when expected before running it for hours."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "party-vip",
    "category": "Features",
    "title": "Party mode and VIP servers",
    "summary": "What to check when using multiplayer or private servers.",
    "sections": [
      {
        "title": "Before starting",
        "paragraphs": [
          "Ultimate Macro includes Party and VIP server workflows in documented releases. Ensure all required accounts, access permissions, invites, and loadouts are ready."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "If invitations fail",
        "paragraphs": [
          "Verify the Roblox account can join the intended experience manually, then test party handling under supervision and record the exact failure step."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "discord-webhooks",
    "category": "Discord & community",
    "title": "Set up Discord webhooks",
    "summary": "Send runtime logs, screenshots, and session information to a private Discord channel.",
    "sections": [
      {
        "title": "Create a webhook",
        "paragraphs": [],
        "steps": [
          "In Discord, open a server channel's settings.",
          "Choose Integrations → Webhooks and create a webhook.",
          "Copy the webhook URL.",
          "In Ultimate Macro's Discord tab, enable webhooks and paste the URL.",
          "Use Test Webhook before saving."
        ],
        "checks": []
      },
      {
        "title": "Available reporting",
        "paragraphs": [
          "The documented Discord integration can send debug logs, OCR-based statistics, periodic screenshots, and end-of-match results."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Protect your webhook",
        "paragraphs": [
          "A webhook URL is a secret: anyone holding it can send messages to that channel. Do not post it in public screenshots or support tickets."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "discord-remote",
    "category": "Discord & community",
    "title": "Discord remote control",
    "summary": "Control selected macro actions and request status through supported Discord integrations.",
    "sections": [
      {
        "title": "Supported workflows",
        "paragraphs": [
          "The documented EngineerBot integration can start and stop the macro, request status and screenshots, and query logs, version, and the selected strategy. The release also documents an optional personal-bot interface."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "When commands fail",
        "paragraphs": [
          "Start with local macro operation: the remote interface cannot fix an installation that already fails to start. Recheck connection state and bot configuration, then test a simple status request."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "profiles",
    "category": "Features",
    "title": "Profile Manager",
    "summary": "Back up, import, and export settings and strategies.",
    "sections": [
      {
        "title": "What it handles",
        "paragraphs": [
          "Profile Manager supports importing and exporting settings, hotkeys, and strategies with previews and backups in documented releases."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Before importing",
        "paragraphs": [
          "Keep a separate copy of your current working profile. Review the preview so a shared profile does not silently replace your own hotkeys or strategy choices."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "potato-mode",
    "category": "Features",
    "title": "Potato Mode and slow computers",
    "summary": "Reduce time-sensitive failures on slower Windows devices.",
    "sections": [
      {
        "title": "When to try it",
        "paragraphs": [
          "If the application runs but actions are delayed or image detection is inconsistent, enable Potato Mode and increase delays rather than immediately reinstalling the macro."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Test properly",
        "paragraphs": [
          "Compare one supervised match before and after the setting change. Avoid altering resolution, scaling, and timing all at once."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "auto-configure",
    "category": "Features",
    "title": "Auto Configure Settings",
    "summary": "Let the macro prepare supported Roblox settings when available.",
    "sections": [
      {
        "title": "How it works",
        "paragraphs": [
          "Documented releases offer an optional Auto Configure Settings flow for Roblox-side settings and restore the previous values afterward."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Still verify manually",
        "paragraphs": [
          "Windows resolution, display scaling, language packs, and all TDS settings still deserve a quick check. Never assume automation configured an unrelated application."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "recover-disconnect",
    "category": "Troubleshooting",
    "title": "Roblox disconnected during a session",
    "summary": "Diagnose reconnection and automatic re-entry behavior.",
    "sections": [
      {
        "title": "Expected behavior",
        "paragraphs": [
          "Documented versions contain reconnect and game re-entry handling, as well as resume-aware startup in supported states."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "When it does not recover",
        "paragraphs": [],
        "steps": [
          "Check Roblox and your network connection manually.",
          "Confirm no unexpected modal window or login prompt is blocking Roblox.",
          "Stop safely with F2 if possible, then collect the session logs.",
          "Retry under supervision and report the last visible state, version, and logs."
        ],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "wrong-clicks",
    "category": "Troubleshooting",
    "title": "Macro clicks the wrong place",
    "summary": "Fix incorrect placement targets, UI misses, and actions that appear to do nothing.",
    "sections": [
      {
        "title": "Check these first",
        "paragraphs": [],
        "steps": [
          "Confirm your display uses supported 16:9 resolution and preferably 100% Windows scaling.",
          "Keep the Windows taskbar visible.",
          "Set TDS UI Scale to Large and Screen Shake to Disabled.",
          "Confirm Roblox is focused, and has not moved or resized since starting.",
          "Test one known bundled strategy while watching it."
        ],
        "checks": []
      },
      {
        "title": "If clicks still miss",
        "paragraphs": [
          "Record the exact action, resolution, scaling percentage, macro version, and relevant logs. Randomly increasing all delays rarely fixes a geometry mismatch."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "launch-fails",
    "category": "Troubleshooting",
    "title": "Main.ahk will not start",
    "summary": "Resolve the most common startup blockers.",
    "sections": [
      {
        "title": "Check in order",
        "paragraphs": [],
        "steps": [
          "Install AutoHotkey v2.0 64-bit; version 1.1 is not compatible.",
          "Fully extract the release ZIP, preserving its folders and runtime files.",
          "Ensure .ahk files open with AutoHotkey v2.",
          "Close Roblox multi-client utilities such as Roblox Account Manager.",
          "Relaunch Main.ahk from the extracted folder."
        ],
        "checks": []
      },
      {
        "title": "Still failing?",
        "paragraphs": [
          "Capture the exact error message, Windows version, AutoHotkey version, and release version. Avoid posting personal file paths or tokens publicly."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "ocr-errors",
    "category": "Troubleshooting",
    "title": "Waves or currency are read incorrectly",
    "summary": "Fix OCR problems when the macro cannot recognize text.",
    "sections": [
      {
        "title": "Primary checks",
        "paragraphs": [],
        "steps": [
          "Install the Windows English (US) OCR language pack.",
          "Remove Roblox custom font modifications.",
          "Return Windows scaling to 100% for a baseline test.",
          "Check that the relevant game UI is visible and not obscured.",
          "Retry in a supervised run and compare the detected values."
        ],
        "checks": []
      },
      {
        "title": "How to report",
        "paragraphs": [
          "Include the macro version, a cropped screenshot with private details removed, expected value, and observed value."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "stuck-between-matches",
    "category": "Troubleshooting",
    "title": "Macro gets stuck between matches",
    "summary": "Debug results, lobby transitions, and a session that stops progressing.",
    "sections": [
      {
        "title": "Before resetting everything",
        "paragraphs": [],
        "steps": [
          "Check for a Roblox disconnect, modal, dialog, or unexpected game update.",
          "Confirm result screens and menus are visible at the expected scale.",
          "Stop with F2 and retry with a known-good single strategy.",
          "Collect the logs around the last successful action and the next attempted action."
        ],
        "checks": []
      },
      {
        "title": "What to report",
        "paragraphs": [
          "Provide the exact game state, version, strategy, and whether the issue reproduces every time."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "upgrade-not-working",
    "category": "Troubleshooting",
    "title": "Tower upgrades fail or are skipped",
    "summary": "Differentiate timing, insufficient funds, and upgrade-panel problems.",
    "sections": [
      {
        "title": "Isolate the reason",
        "paragraphs": [],
        "steps": [
          "Check whether the tower has enough money for the upgrade.",
          "Verify the tower upgrade panel is visible and not blocked.",
          "Confirm Prefer Vertical Upgrades is enabled in TDS.",
          "Try a supervised strategy run with slightly more generous delays.",
          "Save logs showing the intended and observed action."
        ],
        "checks": []
      },
      {
        "title": "Avoid masking a bug",
        "paragraphs": [
          "If the interface shows an upgrade that the macro counted as successful but did not occur, report that precise mismatch rather than repeatedly restarting Roblox."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "discord-not-working",
    "category": "Troubleshooting",
    "title": "Discord logs or remote commands fail",
    "summary": "Find problems with Discord webhook and remote connection configuration.",
    "sections": [
      {
        "title": "Test from simplest to hardest",
        "paragraphs": [],
        "steps": [
          "Confirm the macro itself launches and runs locally.",
          "Test a Discord webhook using the built-in Test Webhook button.",
          "Check the webhook was not deleted and was pasted without extra characters.",
          "For remote commands, verify the supported bot connection and permissions.",
          "Collect connection diagnostics without sharing tokens, webhook URLs, or secrets."
        ],
        "checks": []
      },
      {
        "title": "Keep access safe",
        "paragraphs": [
          "Anyone with a bot token or webhook URL can abuse it. Revoke and replace exposed credentials immediately."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "safe-stop",
    "category": "Troubleshooting",
    "title": "Stop a macro safely",
    "summary": "Use the stop shortcut and avoid stuck key or mouse input.",
    "sections": [
      {
        "title": "Normal stop",
        "paragraphs": [
          "Press F2. The documented stop flow releases held input and lets the macro perform cleanup."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "If it will not stop",
        "paragraphs": [
          "Do not leave an uncontrolled automation running. Regain control of Windows, close the macro if necessary, and restart it only after investigating the issue."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "/guide/"
  },
  {
    "slug": "discord-community",
    "category": "Discord & community",
    "title": "Ultimate Macro Discord server",
    "summary": "Where to get announcements, support, community strategies, and help.",
    "sections": [
      {
        "title": "Join the community",
        "paragraphs": [
          "The official Discord server is linked below. Check its current channel descriptions and rules: channel names, role availability, and events can change."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Get useful support",
        "paragraphs": [
          "When requesting help, include the macro version, game mode, a clear description of the failure, the last action that worked, and relevant logs. Never share account credentials or private webhook tokens."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "https://discord.gg/ultmacro"
  },
  {
    "slug": "report-issue",
    "category": "Discord & community",
    "title": "Report a bug properly",
    "summary": "Provide enough information to reproduce a problem and verify a fix.",
    "sections": [
      {
        "title": "Include this information",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Ultimate Macro version and release source",
          "Windows resolution and scaling",
          "Roblox/TDS settings and game mode",
          "Exact steps to reproduce",
          "What you expected and what actually happened",
          "Logs and redacted screenshots, if available"
        ]
      },
      {
        "title": "Where to report",
        "paragraphs": [
          "Use the official GitHub issues page or the appropriate Discord support channel. Search for an existing issue before opening a duplicate."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/issues"
  },
  {
    "slug": "about",
    "category": "Discord & community",
    "title": "About Ultimate Macro",
    "summary": "What Ultimate Macro is, who maintains it, and the licensing basics.",
    "sections": [
      {
        "title": "The project",
        "paragraphs": [
          "Ultimate Macro is a free, open-source Windows macro for Roblox Tower Defense Simulator. It records and replays strategies using image detection, coordinates, and OCR."
        ],
        "steps": [],
        "checks": []
      },
      {
        "title": "Credits and licensing",
        "paragraphs": [
          "Originally created by Darksen. Ultimate Macro: The New Era is maintained by the community and distributed under GNU GPL v3.0. See the current repository for accurate contributors and license text."
        ],
        "steps": [],
        "checks": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era"
  }
];
