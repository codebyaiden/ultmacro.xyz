import { expandedArticles } from './content-expanded.mjs';
import { sourceVerifiedArticles } from './content-v135-source.mjs';
// Source-backed wiki content. Check instructions against the official release before updating.
export const categories = ["Start here","Setup & settings","Strategies","Sessions & tools","Troubleshooting","Community"];
const baseArticles = [
  {
    "slug": "install",
    "category": "Start here",
    "title": "Install Ultimate Macro",
    "summary": "From ZIP download to first launch.",
    "sections": [
      {
        "title": "Download and extract",
        "paragraphs": [],
        "steps": [
          "Download the ZIP from the official Ultimate Macro download page.",
          "Right-click the ZIP and extract the whole archive to a folder. Do not run Main.ahk inside the ZIP.",
          "Install 64-bit AutoHotkey v2 from autohotkey.com/v2. AutoHotkey v1.1 will not work.",
          "Open Main.ahk in the extracted folder."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Before your first run",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Windows resolution: supported 16:9; scaling: 100% recommended",
          "Windows taskbar: visible",
          "Roblox: 60 FPS, Classic camera, Manual graphics",
          "TDS: Large UI, Screen Shake off, Vertical Upgrades on"
        ],
        "rows": []
      }
    ],
    "source": "/guide/install/",
    "keywords": [
      "download",
      "zip",
      "autohotkey",
      "main ahk",
      "launch"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "requirements",
    "category": "Start here",
    "title": "Requirements",
    "summary": "Supported Windows versions, resolution and dependencies.",
    "sections": [
      {
        "title": "Required",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Operating system",
            "Windows 10 or 11"
          ],
          [
            "AutoHotkey",
            "v2.0, 64-bit"
          ],
          [
            "Display",
            "16:9, 1280×720 through 3840×2160"
          ],
          [
            "Windows OCR",
            "English (United States) language pack"
          ],
          [
            "Taskbar",
            "Visible, not auto-hidden"
          ],
          [
            "Roblox",
            "Single client; close multi-instance tools"
          ]
        ]
      },
      {
        "title": "Recommended",
        "paragraphs": [
          "1920×1080 at 100% Windows scaling is the easiest baseline for troubleshooting. Other supported 16:9 resolutions are supported by the documented adaptive detection path.",
          "A slower PC may need longer mouse, key or upgrade delays."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/requirements/",
    "keywords": [
      "computer",
      "pc",
      "windows",
      "resolution",
      "system",
      "minimum"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "first-run",
    "category": "Start here",
    "title": "Run your first strategy",
    "summary": "Test a built-in strategy before leaving the macro unattended.",
    "sections": [
      {
        "title": "Start a test run",
        "paragraphs": [],
        "steps": [
          "Open Roblox and join Tower Defense Simulator.",
          "Open Ultimate Macro. On the Main tab, select a strategy that came with the release.",
          "Confirm you have the towers required by that strategy.",
          "Make sure Windows, Roblox, and TDS settings match the setup pages.",
          "Select Start or press F1.",
          "Watch a full match, including upgrades and the end-of-match screen."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Stop safely",
        "paragraphs": [
          "Press F2 to stop the macro and release held input. Check placement, upgrades, result detection, and the next-match transition before running longer sessions."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/first-run/",
    "keywords": [
      "start",
      "run",
      "play",
      "first",
      "f1",
      "f2"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "windows-display",
    "category": "Setup & settings",
    "title": "Windows display & OCR",
    "summary": "Configure the screen settings used by image detection.",
    "sections": [
      {
        "title": "Windows settings",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Resolution",
            "16:9, 1280×720 to 3840×2160"
          ],
          [
            "Recommended resolution",
            "1920×1080"
          ],
          [
            "Display scaling",
            "100% recommended"
          ],
          [
            "Taskbar",
            "Visible; do not auto-hide"
          ],
          [
            "OCR language",
            "English (United States) installed"
          ]
        ]
      },
      {
        "title": "Check before running",
        "paragraphs": [],
        "steps": [
          "Open Windows Settings → System → Display and confirm resolution and scale.",
          "Make the taskbar visible in Windows taskbar settings.",
          "Ensure the English (US) OCR language pack is available.",
          "Do not move or resize Roblox while a run is in progress."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "When clicks miss",
        "paragraphs": [
          "If the macro clicks the wrong location, check display geometry before increasing delays. The macro uses screen coordinates and image matching."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/display/",
    "keywords": [
      "screen",
      "monitor",
      "scale",
      "dpi",
      "resolution",
      "ocr",
      "taskbar"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "roblox-settings",
    "category": "Setup & settings",
    "title": "Roblox settings",
    "summary": "Use the game settings expected by the documented macro.",
    "sections": [
      {
        "title": "Set these values",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Maximum Frame Rate",
            "60 FPS"
          ],
          [
            "Camera Mode",
            "Classic"
          ],
          [
            "Graphics Mode",
            "Manual"
          ],
          [
            "UI Navigation Toggle",
            "Enabled"
          ]
        ]
      },
      {
        "title": "Avoid layout changes",
        "paragraphs": [
          "Do not use custom Roblox fonts. They can cause wave and currency OCR to read text incorrectly. Keep the game window at the same size and location during a session."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/display/",
    "keywords": [
      "camera",
      "fps",
      "graphics",
      "navigation",
      "roblox"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "tds-settings",
    "category": "Setup & settings",
    "title": "TDS settings",
    "summary": "Match the interface layout expected by tower placement and upgrades.",
    "sections": [
      {
        "title": "Set these values",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "UI Scale",
            "Large"
          ],
          [
            "Screen Shake",
            "Disabled"
          ],
          [
            "Prefer Vertical Upgrades",
            "Enabled"
          ],
          [
            "Dialog",
            "Disabled"
          ],
          [
            "Show Tower Options",
            "Enabled"
          ]
        ]
      }
    ],
    "source": "/guide/display/",
    "keywords": [
      "tds",
      "tower defense simulator",
      "ui scale",
      "shake",
      "vertical upgrade",
      "dialog"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "hotkeys",
    "category": "Setup & settings",
    "title": "Hotkeys & keybinds",
    "summary": "Playback and recording shortcuts in the documented release.",
    "sections": [
      {
        "title": "Playback",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Start macro",
            "F1"
          ],
          [
            "Stop macro",
            "F2"
          ]
        ]
      },
      {
        "title": "Recording",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Place tower",
            "F"
          ],
          [
            "Upgrade",
            "Ctrl + U"
          ],
          [
            "Sell tower",
            "Ctrl + X"
          ],
          [
            "Change target",
            "Ctrl + `"
          ],
          [
            "Change DJ track",
            "Ctrl + D"
          ],
          [
            "Align camera",
            "Ctrl + T"
          ],
          [
            "Hologram tower",
            "Ctrl + Alt + H"
          ],
          [
            "Delete last recorded action",
            "Ctrl + B"
          ],
          [
            "Record inputs",
            "Ctrl + Shift + E"
          ]
        ]
      },
      {
        "title": "Change shortcuts",
        "paragraphs": [
          "Recording shortcuts are configurable under Settings → Recording Hotkeys. For abilities, confirm the keybinds in Settings → TDS Keybinds also match TDS."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/recording/",
    "keywords": [
      "keybind",
      "shortcut",
      "f1",
      "f2",
      "f",
      "ctrl",
      "ability",
      "recording"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "record-strategy",
    "category": "Strategies",
    "title": "Record a strategy",
    "summary": "Turn a played match into a .strat file.",
    "sections": [
      {
        "title": "Before recording",
        "paragraphs": [
          "Pick your map, mode and tower loadout. Confirm the game and recording keybinds first. The recorder captures actions as you play, not a guaranteed successful strategy."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Record and save",
        "paragraphs": [],
        "steps": [
          "Open Create → Record a Strategy.",
          "Play a match normally. Use the recording shortcuts for placement, upgrades, selling and other actions.",
          "If an action was recorded incorrectly, use Delete Record (Ctrl + B) before continuing.",
          "Finish recording and save the result as a .strat file.",
          "Replay the new strategy under supervision before sharing it."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Useful shortcuts",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Place",
            "F"
          ],
          [
            "Upgrade",
            "Ctrl + U"
          ],
          [
            "Sell",
            "Ctrl + X"
          ],
          [
            "Change target",
            "Ctrl + `"
          ],
          [
            "Change DJ track",
            "Ctrl + D"
          ]
        ]
      },
      {
        "title": "Recording tip",
        "paragraphs": [
          "Leave enough time for game animations and currency changes. Fast manual actions may need longer delays to replay reliably on other PCs."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/recording/",
    "keywords": [
      "create",
      "save",
      ".strat",
      "record",
      "strategy",
      "tower"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "edit-strategy",
    "category": "Strategies",
    "title": "Edit a strategy",
    "summary": "Open a .strat file in Strategy Lab.",
    "sections": [
      {
        "title": "Open Strategy Lab",
        "paragraphs": [],
        "steps": [
          "In Ultimate Macro, open Create.",
          "Choose Edit a Strategy or Open Strategy Lab.",
          "Open the .strat file you want to inspect or change.",
          "Save a separate copy before replacing a strategy that already works."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Standalone editor",
        "paragraphs": [
          "You can also launch StrategyLab.exe from the release folder. Strategy Lab is the visual editor for strategy actions. Test an edited strategy before relying on it."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/recording/",
    "keywords": [
      "strategy lab",
      "editor",
      "edit",
      "strat"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "strategy-rotation",
    "category": "Strategies",
    "title": "Rotate strategies",
    "summary": "Alternate between two strategies after a run count or time limit.",
    "sections": [
      {
        "title": "Configure rotation",
        "paragraphs": [],
        "steps": [
          "On the Main tab, choose the two strategies you want to alternate.",
          "Enable Strategy Rotation.",
          "Set Swap after to a number of Runs or Minutes.",
          "Test each strategy on its own before starting rotation."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Check compatibility",
        "paragraphs": [
          "The selected strategies may require different maps or towers. Make sure both can run with your current loadout and settings."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/sessions/",
    "keywords": [
      "swap",
      "rotate",
      "alternating",
      "runs",
      "minutes"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "community-strategies",
    "category": "Strategies",
    "title": "Find community strategies",
    "summary": "Browse and test shared .strat files in Strategy Network.",
    "sections": [
      {
        "title": "Use a shared strategy",
        "paragraphs": [],
        "steps": [
          "Open Strategy Network and find a strategy for your mode or map.",
          "Check the tower loadout and other listed requirements.",
          "Download or choose the strategy through the supported workflow.",
          "Run a supervised match before leaving it unattended."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "After a game update",
        "paragraphs": [
          "An older strategy may no longer match current game behavior, even if its file loads. Check its requirements and look for a newer version if it fails."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/strategies/",
    "keywords": [
      "strategy network",
      "shared",
      "download",
      "community",
      "maps"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "session-settings",
    "category": "Sessions & tools",
    "title": "Long session settings",
    "summary": "Goals, timescale, and between-match actions.",
    "sections": [
      {
        "title": "Goals and Timescale",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Goals",
            "Set a currency target; the macro selects compatible strategies until the goal is reached."
          ],
          [
            "Timescale",
            "In Settings, use 1.5× or 2× with available timescale tickets."
          ]
        ]
      },
      {
        "title": "Between matches",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Click Restart button",
            "Used after a loss; enabled by default."
          ],
          [
            "Click Play Again button",
            "Used after a win; enabled by default."
          ],
          [
            "Check the map",
            "Verifies the destination map after joining and reloads if wrong. Recommended on."
          ],
          [
            "Collect playtime rewards",
            "Claims playtime and daily rewards when available."
          ]
        ]
      },
      {
        "title": "Before a long session",
        "paragraphs": [
          "Watch one full match first. If you are running a win-only strategy and Restart lands you on the wrong map, try disabling the restart action."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/sessions/",
    "keywords": [
      "goals",
      "timescale",
      "speed",
      "rewards",
      "play again",
      "restart",
      "check map",
      "currency"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "party-vip",
    "category": "Sessions & tools",
    "title": "Party & VIP servers",
    "summary": "Private server links and Host/Member party configuration.",
    "sections": [
      {
        "title": "VIP server",
        "paragraphs": [],
        "steps": [
          "Paste a private server link into VIP Server Link.",
          "Enable Use VIP Server.",
          "Confirm that the Roblox account can join that server manually before testing the macro."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Party mode",
        "paragraphs": [],
        "steps": [
          "Open the Party tab.",
          "Select Host to create a party and invite others, or Member to wait for an invite.",
          "Enter the host's display name and members' names.",
          "Choose whether to return to the lobby when all or any party member leaves.",
          "Save and test the group with all accounts present."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/sessions/",
    "keywords": [
      "party",
      "vip",
      "private server",
      "host",
      "member",
      "invite"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "profiles",
    "category": "Sessions & tools",
    "title": "Back up your setup",
    "summary": "Export or import settings, hotkeys and strategies with Profile Manager.",
    "sections": [
      {
        "title": "Export before changing your setup",
        "paragraphs": [
          "Profile Manager bundles settings, hotkeys and strategies for backup or moving to another PC. Export a working configuration before experimenting."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Import with care",
        "paragraphs": [
          "Check the import preview before replacing existing settings, hotkeys or strategies."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/discord/",
    "keywords": [
      "profile manager",
      "backup",
      "import",
      "export",
      "settings"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "tools",
    "category": "Sessions & tools",
    "title": "Built-in tools",
    "summary": "Auto Call of Arms, Auto Spin, and Auto Open Consumable.",
    "sections": [
      {
        "title": "Open a tool",
        "paragraphs": [
          "The Tools tab opens utilities in separate always-on-top windows. F3 starts the selected tool; F4 stops it."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Available tools",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Auto Call of Arms",
            "Triggers Call of Arms and Drop the Beat on configured intervals; each ability can be disabled."
          ],
          [
            "Auto Spin",
            "Claims spinning-wheel prizes and counts tickets used."
          ],
          [
            "Auto Open Consumable",
            "Opens consumable crates and counts how many were opened."
          ]
        ]
      }
    ],
    "source": "/guide/tools/",
    "keywords": [
      "call of arms",
      "auto spin",
      "consumable",
      "f3",
      "f4",
      "utility"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "launch-fails",
    "category": "Troubleshooting",
    "title": "Main.ahk won't open",
    "summary": "Fix common startup failures.",
    "sections": [
      {
        "title": "Check in this order",
        "paragraphs": [],
        "steps": [
          "Extract the entire ZIP before running anything.",
          "Install 64-bit AutoHotkey v2.0. v1.1 cannot run Main.ahk.",
          "Make sure .ahk files open using the AutoHotkey v2 launcher.",
          "Close Roblox Account Manager and other multi-instance utilities.",
          "Open Main.ahk again."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "If the error remains",
        "paragraphs": [
          "Share the exact error, AutoHotkey version and Ultimate Macro version when requesting support."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/troubleshooting/",
    "keywords": [
      "startup",
      "launch",
      "not opening",
      "ahk",
      "autohotkey",
      "crash"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "wrong-clicks",
    "category": "Troubleshooting",
    "title": "Clicks miss or towers won't place",
    "summary": "Check display geometry before changing timing.",
    "sections": [
      {
        "title": "Fix screen-related misses",
        "paragraphs": [],
        "steps": [
          "Check Windows resolution is supported 16:9 and scaling is preferably 100%.",
          "Keep the Windows taskbar visible.",
          "Set TDS UI Scale to Large and turn Screen Shake off.",
          "Focus Roblox. Avoid resizing or moving its window once the run starts.",
          "Test a bundled strategy for one match."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "If actions are late rather than misplaced",
        "paragraphs": [
          "Try a higher Mouse Delay or Key Delay in Settings. A timing issue is different from a consistent wrong click position."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/troubleshooting/",
    "keywords": [
      "tower placement",
      "placement fails",
      "wrong location",
      "mouse",
      "click",
      "cursor"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "ocr-errors",
    "category": "Troubleshooting",
    "title": "Wave or cash detection is wrong",
    "summary": "Correct missing OCR language support and font changes.",
    "sections": [
      {
        "title": "Fix OCR",
        "paragraphs": [],
        "steps": [
          "Install the English (United States) Windows OCR language pack.",
          "Remove custom Roblox font modifications.",
          "Use 100% Windows scaling as a test baseline.",
          "Keep wave and currency UI visible and unobstructed.",
          "Run a short test and compare the on-screen value to the value in macro logs."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Still incorrect?",
        "paragraphs": [
          "Save the release version, screen resolution and a cropped screenshot showing the wrong value. Remove private details before sharing it."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/troubleshooting/",
    "keywords": [
      "ocr",
      "currency",
      "cash",
      "wave",
      "numbers",
      "read"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "upgrade-not-working",
    "category": "Troubleshooting",
    "title": "Upgrades fail or use the wrong path",
    "summary": "Check the upgrade panel, money, keybinds and delay.",
    "sections": [
      {
        "title": "Troubleshoot upgrades",
        "paragraphs": [],
        "steps": [
          "Confirm the tower has enough cash for the action.",
          "Enable Prefer Vertical Upgrades in TDS.",
          "Check that the upgrade and bottom-path keybinds in Ultimate Macro match your game settings.",
          "Increase Upgrade Delay in Settings if the panel opens slowly.",
          "Replay the same step while supervising and record which upgrade was missed."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "What changes the diagnosis",
        "paragraphs": [
          "If the macro clicked the wrong button, check UI settings. If it clicked before the panel appeared, increase the delay. These are different problems."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/troubleshooting/",
    "keywords": [
      "upgrade",
      "path",
      "top",
      "bottom",
      "money",
      "delay"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "abilities-not-working",
    "category": "Troubleshooting",
    "title": "Abilities don't activate",
    "summary": "Fix mismatched TDS ability keybinds.",
    "sections": [
      {
        "title": "Check both sets of keybinds",
        "paragraphs": [],
        "steps": [
          "Open TDS and find the key assigned to the ability.",
          "Open Ultimate Macro → Settings → TDS Keybinds.",
          "Set the matching key in both places.",
          "Test the ability manually, then in a short supervised macro run."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Why there may be no error",
        "paragraphs": [
          "The macro sends the configured key press. If the game expects a different key, no action happens, even though the macro sent its input."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/troubleshooting/",
    "keywords": [
      "ability",
      "abilities",
      "call of arms",
      "dj",
      "brawler",
      "keybind"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "legacy-mode",
    "category": "Troubleshooting",
    "title": "Auto Equip or targeting stopped working",
    "summary": "Legacy Mode deliberately disables some features.",
    "sections": [
      {
        "title": "Check Legacy Mode",
        "paragraphs": [
          "Legacy Mode disables Auto Equip and target changes. Turn it off to use those features."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "What to do",
        "paragraphs": [],
        "steps": [
          "Open Settings and check whether Legacy Mode is enabled.",
          "Disable it to use the adaptive image-detection path.",
          "Retest Auto Equip and tower targeting.",
          "Only use Legacy Mode as a fallback when necessary; it can retain 1920×1080 limitations."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/troubleshooting/",
    "keywords": [
      "legacy",
      "auto equip",
      "target",
      "targeting",
      "disabled"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "stuck-between-matches",
    "category": "Troubleshooting",
    "title": "Stuck after a match",
    "summary": "Check restart, play-again, and map verification.",
    "sections": [
      {
        "title": "Check the transition",
        "paragraphs": [],
        "steps": [
          "Check whether the macro stopped on a win, loss, lobby, or Ready screen.",
          "Verify that Click Restart and Click Play Again are configured for your strategy.",
          "Keep Check the map enabled so a wrong map can be detected.",
          "Stop with F2 and replay a single strategy while watching the transition.",
          "Save the last log entry and the screen state if it gets stuck again."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Wrong map after a win-only run?",
        "paragraphs": [
          "Disable Click Restart if a win-only strategy sends you to the wrong map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/sessions/",
    "keywords": [
      "restart",
      "play again",
      "map",
      "stuck",
      "lobby",
      "between"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "recover-disconnect",
    "category": "Troubleshooting",
    "title": "Roblox disconnects during a run",
    "summary": "What recovery handles and what to check when it stalls.",
    "sections": [
      {
        "title": "Automatic recovery",
        "paragraphs": [
          "Ultimate Macro can reconnect Roblox and re-enter TDS after a disconnect. If it stops at a login prompt or unexpected dialog, use the checks below."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "If it doesn't rejoin",
        "paragraphs": [],
        "steps": [
          "Check whether Roblox can connect normally.",
          "Dismiss unexpected Roblox dialogs or login prompts.",
          "Stop with F2 if possible and save the recent logs.",
          "Retry while watching the reconnect sequence and identify the screen where it gets stuck."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/sessions/",
    "keywords": [
      "reconnect",
      "disconnect",
      "roblox",
      "lost connection",
      "retry",
      "recover"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "discord-not-working",
    "category": "Troubleshooting",
    "title": "Discord updates aren't arriving",
    "summary": "Separate webhook failures from remote-control failures.",
    "sections": [
      {
        "title": "Webhook test",
        "paragraphs": [],
        "steps": [
          "Open the macro's Discord tab.",
          "Use Test Webhook with your configured URL.",
          "If it fails, confirm the webhook still exists and the right URL was pasted.",
          "Check whether Discord message permissions or channel settings have changed."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Remote commands",
        "paragraphs": [
          "Check that the macro runs locally, then try a bot status request. If that fails, verify the connection for your version."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Keep secrets private",
        "paragraphs": [
          "Never paste webhook URLs or bot tokens into public support posts. Rotate a URL or token if it leaks."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/discord/",
    "keywords": [
      "discord",
      "webhook",
      "bot",
      "remote",
      "status",
      "error"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "discord-webhooks",
    "category": "Community",
    "title": "Send logs to Discord",
    "summary": "Set up a webhook for run logs, stats and screenshots.",
    "sections": [
      {
        "title": "Create a private webhook",
        "paragraphs": [],
        "steps": [
          "In a Discord server, open a channel's settings → Integrations → Webhooks.",
          "Create a webhook and copy its URL.",
          "Open the macro's Discord tab, paste the URL and enable the webhook.",
          "Select the information you want to send, then use Test Webhook."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Available reports",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Send Statistics",
            "Currency and session numbers read with OCR."
          ],
          [
            "Debug Logs",
            "Local debug events forwarded to Discord."
          ],
          [
            "Automatic screenshots",
            "Periodic images during a run."
          ],
          [
            "Triumph / Loss screenshots",
            "Result-screen images, optionally sent to a second webhook."
          ]
        ]
      },
      {
        "title": "Privacy",
        "paragraphs": [
          "Treat a webhook URL as a password. Screenshots may show account names or other on-screen details."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/discord/",
    "keywords": [
      "discord",
      "webhook",
      "logs",
      "screenshots",
      "statistics"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "discord-remote",
    "category": "Community",
    "title": "Remote control from Discord",
    "summary": "Use documented EngineerBot or personal-bot commands.",
    "sections": [
      {
        "title": "What it can do",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Start and stop the macro",
          "Request status or a screenshot",
          "Check version, stats and logs",
          "Check or select the strategy (where supported)"
        ],
        "rows": []
      },
      {
        "title": "Before enabling",
        "paragraphs": [
          "Test a status command before relying on remote controls. Available commands depend on the installed version; keep bot credentials private."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/discord/",
    "keywords": [
      "engineerbot",
      "discord",
      "remote",
      "personal bot",
      "screenshot"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "discord-community",
    "category": "Community",
    "title": "Discord community",
    "summary": "Find announcements, strategies and support.",
    "sections": [
      {
        "title": "Official server",
        "paragraphs": [
          "The official Discord hosts announcements, community strategies and support. See the current channels for roles and events."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Before asking for help",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Macro version",
          "What you were doing",
          "What happened versus what you expected",
          "Relevant log or screenshot with personal details removed"
        ],
        "rows": []
      }
    ],
    "source": "https://discord.gg/ultmacro",
    "keywords": [
      "discord",
      "server",
      "roles",
      "support",
      "community"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "report-issue",
    "category": "Community",
    "title": "Report an issue",
    "summary": "Give developers a reproducible report instead of a vague description.",
    "sections": [
      {
        "title": "Collect the important details",
        "paragraphs": [],
        "steps": [
          "Enable Debug Logs in Settings.",
          "Reproduce the problem once, if safe.",
          "Note the version, Windows resolution and game settings.",
          "Describe the expected result and actual result.",
          "Attach the relevant log and a redacted screenshot when useful.",
          "Search existing GitHub issues before filing a new one."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Where to send it",
        "paragraphs": [
          "Send the report to GitHub Issues or the official Discord support channel. Remove credentials and webhook URLs from any logs."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/issues",
    "keywords": [
      "bug",
      "issue",
      "error",
      "report",
      "log",
      "support"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "about",
    "category": "Community",
    "title": "About Ultimate Macro",
    "summary": "Project background and license.",
    "sections": [
      {
        "title": "What it is",
        "paragraphs": [
          "Ultimate Macro is a free, open-source Windows macro for Roblox Tower Defense Simulator. It uses image detection and OCR rather than injecting code into Roblox."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Open source",
        "paragraphs": [
          "The New Era continues the project originally created by Darksen. The public code is distributed under GPL-3.0. Read the repository for license terms, contributors and releases."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Not an official Roblox product",
        "paragraphs": [
          "Ultimate Macro is a third-party tool and is not affiliated with Roblox or Paradoxum Games. Automation carries account and game-policy risks."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era",
    "keywords": [
      "about",
      "license",
      "source",
      "history"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "slow-inputs",
    "category": "Troubleshooting",
    "title": "Macro is slow or misses inputs",
    "summary": "Adjust timing and performance settings without breaking placement.",
    "sections": [
      {
        "title": "Change one delay at a time",
        "paragraphs": [],
        "steps": [
          "Open Ultimate Macro Settings.",
          "If upgrades are skipped while the upgrade panel loads, raise Upgrade Delay.",
          "If mouse actions happen too quickly, increase Mouse Delay.",
          "If key presses are missed, increase Key Delay.",
          "Test a short run after each adjustment so you know which change helped."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "On weaker PCs",
        "paragraphs": [
          "Potato Mode lowers macro overhead on slower machines. Try it before switching image detection methods."
        ],
        "steps": [],
        "checks": [
          "Keep Legacy Mode off unless needed as a fallback.",
          "Legacy Mode may be limited to 1920×1080 and disables Auto Equip and target changes."
        ],
        "rows": []
      }
    ],
    "source": "/guide/troubleshooting/",
    "keywords": [
      "lag",
      "slow",
      "delay",
      "mouse",
      "keyboard",
      "potato",
      "mode",
      "freezes",
      "timing"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "record-abilities",
    "category": "Strategies",
    "title": "Record DJ and tower abilities",
    "summary": "Hotkeys for DJ tracks, Necromancer and Brawler actions.",
    "sections": [
      {
        "title": "DJ track changes",
        "paragraphs": [
          "The existing recorder also supports scheduling DJ disc changes by wave."
        ],
        "steps": [
          "Open Create → Record a Strategy.",
          "During the match, use Ctrl + D to record a DJ track change.",
          "Save the .strat file and replay it to confirm the track change is timed correctly."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Necromancer and Brawler",
        "paragraphs": [
          "To record Raise the Dead (Necromancer) or a Brawler reposition, hold Ctrl with the ability's in-game keybind. These actions do not use a separate recording shortcut."
        ],
        "steps": [],
        "checks": [
          "Confirm the ability keybinds in Ultimate Macro match TDS.",
          "Test the strategy before sharing it."
        ],
        "rows": []
      }
    ],
    "source": "/guide/recording/",
    "keywords": [
      "dj",
      "track",
      "disc",
      "change",
      "abilities",
      "record",
      "necromancer",
      "brawler",
      "keybind"
    ],
    "version": "v1.3.x"
  },
  {
    "slug": "timescale-tickets",
    "category": "Sessions & tools",
    "title": "Use Timescale tickets",
    "summary": "Configure 1.5× or 2× matches when you have tickets.",
    "sections": [
      {
        "title": "Configure Timescale",
        "paragraphs": [],
        "steps": [
          "Confirm that timescale tickets are available on the Roblox account.",
          "Open Ultimate Macro Settings.",
          "Set Timescale to 1.5× or 2×.",
          "Run one match while watching its timing and game transitions."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Check the strategy",
        "paragraphs": [
          "Faster games reduce run time, but a strategy still needs to work at the selected speed. Return to standard speed if the run repeatedly stalls or misses actions."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "/guide/sessions/",
    "keywords": [
      "timescale",
      "tickets",
      "1.5x",
      "2x",
      "speed",
      "quick",
      "run"
    ],
    "version": "v1.3.x"
  }
];

export const articles = [...baseArticles, ...expandedArticles, ...sourceVerifiedArticles];
