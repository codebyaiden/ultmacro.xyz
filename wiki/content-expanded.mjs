export const expandedArticles = [
  {
    "slug": "official-downloads",
    "category": "Start here",
    "title": "Use official release downloads",
    "summary": "Find trusted ZIP files and check which release you are installing.",
    "sections": [
      {
        "title": "Where to download",
        "paragraphs": [
          "Use the Ultimate Macro download page or the releases published by UltimateMacro/Ultimate-Macro-New-Era. The source repository itself is not a substitute for the complete packaged ZIP."
        ],
        "steps": [
          "Open the Download page or official GitHub Releases.",
          "Choose the release you want to use and read its notes.",
          "Download its ZIP asset, then extract it completely."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Before updating",
        "paragraphs": [
          "Keep a copy of your working custom .strat files and configuration. Test any version change with a short supervised run."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "official",
      "github",
      "release",
      "download",
      "zip",
      "trusted"
    ],
    "source": "/download/",
    "version": "v1.3.x"
  },
  {
    "slug": "zip-folders",
    "category": "Start here",
    "title": "Keep release folders together",
    "summary": "Why Main.ahk must stay beside its libraries and resources.",
    "sections": [
      {
        "title": "Required layout",
        "paragraphs": [
          "Extract the release as a complete folder. Main.ahk relies on companion files and folders such as lib, Resources and submacros."
        ],
        "steps": [
          "Extract all ZIP contents, not only Main.ahk.",
          "Keep the original directory structure.",
          "Launch Main.ahk from inside that extracted folder."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "When files go missing",
        "paragraphs": [
          "Download the official release again, extract it into a clean folder, and compare folder contents before transferring personal strategies."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "extract",
      "zip",
      "lib",
      "resources",
      "submacros",
      "directory"
    ],
    "source": "/guide/install/",
    "version": "v1.3.x"
  },
  {
    "slug": "ahk-versions",
    "category": "Start here",
    "title": "AutoHotkey v1 vs v2",
    "summary": "Make sure Main.ahk uses the 64-bit v2 interpreter.",
    "sections": [
      {
        "title": "Supported interpreter",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Required",
            "AutoHotkey v2.0"
          ],
          [
            "Architecture",
            "64-bit"
          ],
          [
            "Not compatible",
            "AutoHotkey v1.1"
          ]
        ]
      },
      {
        "title": "Check the association",
        "paragraphs": [
          "Both AutoHotkey versions can coexist on Windows."
        ],
        "steps": [
          "Install 64-bit AutoHotkey v2.",
          "Check the default application for .ahk files.",
          "Open Main.ahk again with the v2 launcher.",
          "If a 32-bit warning appears, change to the 64-bit build."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "autohotkey",
      "v2",
      "v1",
      "64bit",
      "32bit",
      "interpreter"
    ],
    "source": "/guide/install/",
    "version": "v1.3.x"
  },
  {
    "slug": "first-match-checklist",
    "category": "Start here",
    "title": "First-match checklist",
    "summary": "Use one match to confirm the whole playback loop.",
    "sections": [
      {
        "title": "Before pressing F1",
        "paragraphs": [],
        "steps": [],
        "checks": [
          "Supported 16:9 resolution and visible Windows taskbar",
          "TDS UI Scale: Large, Screen Shake: Disabled",
          "Roblox at 60 FPS with Classic camera",
          "Correct tower loadout and TDS keybinds"
        ],
        "rows": []
      },
      {
        "title": "During the run",
        "paragraphs": [],
        "steps": [
          "Watch the first placement and confirm the tower appears.",
          "Confirm at least one upgrade follows the intended path.",
          "Watch for end-of-match detection and correct return to the next game.",
          "Stop with F2 if anything mismatches and note which step failed."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "first",
      "supervised",
      "run",
      "check",
      "placement",
      "upgrade",
      "result"
    ],
    "source": "/guide/first-run/",
    "version": "v1.3.x"
  },
  {
    "slug": "auto-equip",
    "category": "Sessions & tools",
    "title": "Auto Equip Towers",
    "summary": "Let a strategy's required towers be equipped before the match.",
    "sections": [
      {
        "title": "Enable it",
        "paragraphs": [
          "The Main tab offers Auto Equip Towers for strategies with a defined loadout."
        ],
        "steps": [
          "Choose a strategy with tower requirements.",
          "Confirm the Roblox account owns every required tower, including golden variants.",
          "Enable Auto Equip Towers.",
          "Observe the loadout before your first match."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Limits",
        "paragraphs": [
          "Auto Equip cannot equip a tower the account doesn't own. It is unavailable in Legacy Mode."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "auto",
      "equip",
      "tower",
      "loadout",
      "missing",
      "golden",
      "legacy"
    ],
    "source": "/guide/first-run/",
    "version": "v1.3.x"
  },
  {
    "slug": "default-tds-keybinds",
    "category": "Setup & settings",
    "title": "Default TDS ability keybinds",
    "summary": "Match the recorded macro keys to Tower Defense Simulator.",
    "sections": [
      {
        "title": "Default bindings",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Call of Arms",
            "C"
          ],
          [
            "Drop the Beat",
            "B"
          ],
          [
            "Support Caravan",
            "J"
          ],
          [
            "Raise the Dead",
            "V"
          ],
          [
            "Hologram",
            "K"
          ],
          [
            "Reposition",
            "L"
          ],
          [
            "Upgrade",
            "E"
          ],
          [
            "Bottom path",
            "Z"
          ],
          [
            "Cancel placement",
            "Q"
          ]
        ]
      },
      {
        "title": "Verify both sides",
        "paragraphs": [
          "In Ultimate Macro open Settings → TDS Keybinds, then compare each assigned key with TDS itself. A mismatch can make an ability do nothing without an error."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "hotkeys",
      "default",
      "tds",
      "abilities",
      "command",
      "support",
      "caravan",
      "keys"
    ],
    "source": "/guide/first-run/",
    "version": "v1.3.x"
  },
  {
    "slug": "strategy-browser",
    "category": "Strategies",
    "title": "Community and My Strats",
    "summary": "Use the Main tab's built-in strategy browser.",
    "sections": [
      {
        "title": "Choose a source",
        "paragraphs": [
          "On Main → Strategies, Community contains shared strategy cards and My Strats contains your own files."
        ],
        "steps": [
          "Open the Strategies browser.",
          "Use Community to inspect a shared strategy, or My Strats for your recordings.",
          "Use Browse to select a local .strat file when needed.",
          "Review required towers, map and mode before pressing Start."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Don't skip the test",
        "paragraphs": [
          "Community cards and download metadata do not guarantee a strategy will work after a TDS update. Watch its first match."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "community",
      "my",
      "strats",
      "browser",
      "local",
      "choose",
      "strategies"
    ],
    "source": "/guide/first-run/",
    "version": "v1.3.x"
  },
  {
    "slug": "recording-metadata",
    "category": "Strategies",
    "title": "Strategy recording setup",
    "summary": "Set map, mode, towers and modifiers before capturing actions.",
    "sections": [
      {
        "title": "Create → Record a Strategy",
        "paragraphs": [],
        "steps": [
          "Choose the map and mode from the dropdowns.",
          "Enter required towers as a comma-separated list.",
          "For a golden tower, prefix the name with G, for example G Minigunner.",
          "Hold Ctrl while selecting multiple modifiers.",
          "Choose ability toggles, wave skipping and optional starting movement as needed.",
          "Record your match and save its .strat file."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Supported mode families",
        "paragraphs": [
          "The documented recorder includes Easy, Casual, Intermediate, Molten, Fallen, Frost, Hardcore, Voidcore and Arcade, plus map-specific selections. The game may change available modes."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "record",
      "map",
      "mode",
      "towers",
      "modifier",
      "golden",
      "metadata",
      "strategy"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "recording-modifiers",
    "category": "Strategies",
    "title": "Record multiple modifiers",
    "summary": "Use Ctrl selection when preparing a strategy recording.",
    "sections": [
      {
        "title": "Choose modifiers",
        "paragraphs": [],
        "steps": [
          "Open Create → Record a Strategy.",
          "Find the Modifiers control.",
          "Hold Ctrl while selecting or deselecting additional modifiers.",
          "Confirm your selection before starting the match.",
          "Save and replay the strategy to verify the configuration."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Why record metadata",
        "paragraphs": [
          "A strategy without correct mode and modifier information can run on the wrong configuration even when its actions are valid."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "record",
      "modifiers",
      "ctrl",
      "multi",
      "select",
      "recording"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "golden-tower-requirements",
    "category": "Strategies",
    "title": "Specify golden tower requirements",
    "summary": "How the recording loadout denotes golden variants.",
    "sections": [
      {
        "title": "Tower list format",
        "paragraphs": [
          "Recording accepts a comma-separated tower list. Use the G prefix for a golden version, such as G Minigunner, alongside regular names like Ranger or Commander."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Check before sharing",
        "paragraphs": [],
        "steps": [
          "Confirm the golden tower variant is required by the strategy.",
          "Include it in the recording metadata.",
          "Tell users they must own it before trying Auto Equip.",
          "Test that the matching loadout is equipped."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "golden",
      "tower",
      "g",
      "prefix",
      "recording",
      "requirements"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "recording-ability-toggles",
    "category": "Strategies",
    "title": "Recording ability options",
    "summary": "Understand the recording controls for abilities and wave skipping.",
    "sections": [
      {
        "title": "Available recording options",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Use Call of Arms",
            "Record or enable relevant ability automation"
          ],
          [
            "Use Support Caravan",
            "Include support ability use"
          ],
          [
            "Use Drop the Beat",
            "Include DJ ability use"
          ],
          [
            "Auto Skip Waves",
            "Include recorded skip behavior"
          ],
          [
            "Abilities Spam",
            "Set the recorder's repeated ability option"
          ]
        ]
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Confirm game keybinds and ability ownership on the receiving account. A toggle is not proof a tower or ability is available."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "record",
      "call",
      "of",
      "arms",
      "support",
      "caravan",
      "drop",
      "the",
      "beat",
      "skip",
      "waves",
      "ability"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "recording-movement",
    "category": "Strategies",
    "title": "Record opening movement",
    "summary": "Configure optional starting movement before tower placement.",
    "sections": [
      {
        "title": "Move option",
        "paragraphs": [
          "The documented recording form can move your Roblox character in a chosen direction for a specified number of milliseconds at the start of a run."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Use carefully",
        "paragraphs": [],
        "steps": [
          "Open the recording setup.",
          "Choose a starting direction only when the strategy requires it.",
          "Set a short movement duration in milliseconds.",
          "Record and test the opening sequence before extending the duration."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "record",
      "move",
      "milliseconds",
      "direction",
      "initial",
      "character"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "recording-quality",
    "category": "Strategies",
    "title": "Record a repeatable strategy",
    "summary": "Avoid capturing rushed actions that fail on replay.",
    "sections": [
      {
        "title": "Before recording",
        "paragraphs": [
          "The recorder saves what you actually do. A winning match doesn't guarantee a repeatable strategy if clicks and upgrades are too tightly spaced."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Improve your recording",
        "paragraphs": [],
        "steps": [
          "Use stable Windows and TDS settings.",
          "Allow UI panels to open before taking the next action.",
          "Wait for cash to become available before upgrading.",
          "Use descriptive filenames, for example pw2_solo_farm.strat.",
          "Replay the finished file and watch the whole match."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "reliable",
      "recording",
      "timing",
      "money",
      "delay",
      "test"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "tower-upgrade-paths",
    "category": "Strategies",
    "title": "Record split upgrade paths",
    "summary": "Capture the intended top or bottom upgrade path.",
    "sections": [
      {
        "title": "Record upgrades",
        "paragraphs": [
          "The recorded strategy format supports top and bottom upgrade paths as separate actions."
        ],
        "steps": [
          "Confirm TDS Prefer Vertical Upgrades is enabled.",
          "Record the tower placement first.",
          "Use the correct upgrade hotkey for the intended path.",
          "Save the .strat and replay until you confirm the right path was upgraded."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Troubleshoot",
        "paragraphs": [
          "If paths differ during replay, verify TDS keybinds and panel layout. Increase Upgrade Delay only when the panel is late opening."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "split",
      "path",
      "top",
      "bottom",
      "upgrades",
      "strategy",
      "recording"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "record-delete-last",
    "category": "Strategies",
    "title": "Undo the last recorded action",
    "summary": "Remove a mistaken recorder action with Ctrl + B.",
    "sections": [
      {
        "title": "During recording",
        "paragraphs": [],
        "steps": [
          "Pause before recording the next action.",
          "Press Ctrl + B to remove the last recorded action.",
          "Check the remaining sequence before continuing.",
          "Save a separate test .strat and replay it to verify the correction."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Default hotkey",
        "paragraphs": [
          "Ctrl + B is the documented default Delete Record shortcut; it can be changed in Recording Hotkeys."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "delete",
      "record",
      "undo",
      "ctrl",
      "b",
      "recording"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "dj-wave-schedule",
    "category": "Strategies",
    "title": "Schedule DJ discs by wave",
    "summary": "Use wave-based DJ track changes instead of manual timing where supported.",
    "sections": [
      {
        "title": "Available recording behavior",
        "paragraphs": [
          "The documented recorder supports DJ disc changes with Ctrl + D and a wave-based schedule."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Validate the sequence",
        "paragraphs": [],
        "steps": [
          "Set the intended DJ change in the strategy's recording flow.",
          "Confirm the starting DJ track.",
          "Run a supervised replay and note the wave on which the disc actually changes.",
          "Adjust the strategy if the match reaches the change earlier than expected."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "dj",
      "disc",
      "wave",
      "schedule",
      "music",
      "record"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "strategy-rotation-runs",
    "category": "Sessions & tools",
    "title": "Rotate strategies after runs",
    "summary": "Switch between two strategies after a chosen run count.",
    "sections": [
      {
        "title": "Main tab",
        "paragraphs": [],
        "steps": [
          "Select two strategies on Main.",
          "Enable Strategy Rotation.",
          "Choose Runs for Swap after.",
          "Enter how many runs to complete before switching.",
          "Watch at least one switch to confirm both strategies start correctly."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Pre-check",
        "paragraphs": [
          "Both strategies need compatible maps, modes and tower loadouts."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "swap",
      "strategy",
      "rotation",
      "runs",
      "count",
      "alternate"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "strategy-rotation-minutes",
    "category": "Sessions & tools",
    "title": "Rotate strategies after minutes",
    "summary": "Use a time interval rather than a run count.",
    "sections": [
      {
        "title": "Main tab",
        "paragraphs": [],
        "steps": [
          "Choose two strategies.",
          "Turn on Strategy Rotation.",
          "Choose Minutes under Swap after.",
          "Set the intended interval.",
          "Watch the first switch and verify the target strategy."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Avoid surprises",
        "paragraphs": [
          "The time setting controls rotation; it does not make an incompatible strategy work with the current towers."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "swap",
      "rotation",
      "minutes",
      "interval",
      "strategy"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "currency-goals",
    "category": "Sessions & tools",
    "title": "Set a currency goal",
    "summary": "Let the macro select compatible strategies until a target is met.",
    "sections": [
      {
        "title": "Goal behavior",
        "paragraphs": [
          "The documented Goals feature uses a currency target, not only a fixed number of runs, and selects compatible strategies toward it."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Set up",
        "paragraphs": [],
        "steps": [
          "Open the session goal controls in your installed version.",
          "Choose the currency and target.",
          "Check that compatible strategies are available.",
          "Watch the first run and confirm progress updates.",
          "Verify that the session stops at the intended target."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "goals",
      "currency",
      "coin",
      "gem",
      "target",
      "stop"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "between-matches-settings",
    "category": "Sessions & tools",
    "title": "Restart, Play Again and map checks",
    "summary": "Set the behavior the macro uses between matches.",
    "sections": [
      {
        "title": "Options",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Click Restart",
            "Used after a loss; normally enabled"
          ],
          [
            "Click Play Again",
            "Used after a win; normally enabled"
          ],
          [
            "Check the map",
            "Verifies the destination map and can reload if incorrect"
          ],
          [
            "Collect playtime rewards",
            "Claims available daily and playtime rewards"
          ]
        ]
      },
      {
        "title": "Recommended test",
        "paragraphs": [
          "Run one match and observe the result-screen action and map selection. For a win-only strategy entering the wrong map, try turning Restart off."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "restart",
      "play",
      "again",
      "check",
      "map",
      "between",
      "matches"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "timescale-confirmation",
    "category": "Sessions & tools",
    "title": "Check Timescale ticket prompts",
    "summary": "Diagnose a Timescale prompt before a faster run.",
    "sections": [
      {
        "title": "First checks",
        "paragraphs": [],
        "steps": [
          "Confirm the account has the required Timescale tickets.",
          "Select 1.5× or 2× in Settings.",
          "Run once under supervision and watch the confirmation flow.",
          "If a ticket prompt prevents starting, return to normal speed and collect the exact prompt."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Scope",
        "paragraphs": [
          "The documented public release supports Timescale. Confirm button labels and confirmation behavior against the installed build before escalating a bug."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "timescale",
      "ticket",
      "prompt",
      "confirmation",
      "1.5",
      "2"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "startup-resume",
    "category": "Sessions & tools",
    "title": "Start from lobby or Ready screen",
    "summary": "How resume-aware startup handles a running Roblox session.",
    "sections": [
      {
        "title": "Supported states",
        "paragraphs": [
          "Documented releases can start while Roblox is already in the TDS lobby or on the Ready screen."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Before testing",
        "paragraphs": [],
        "steps": [
          "Check the correct Roblox window is focused.",
          "Open the macro with a known-good strategy.",
          "Observe the existing game state being recognized.",
          "Stop with F2 if it attempts a wrong transition."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "resume",
      "lobby",
      "ready",
      "startup",
      "detect",
      "existing",
      "session"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "prerun-checks",
    "category": "Sessions & tools",
    "title": "Pre-run diagnostics",
    "summary": "Review resolution, scaling, OCR and dependencies before playing.",
    "sections": [
      {
        "title": "What is checked",
        "paragraphs": [
          "The documented pre-run diagnostics include Windows resolution, display scaling, OCR and missing dependencies."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "If a check fails",
        "paragraphs": [],
        "steps": [
          "Identify the failing prerequisite.",
          "Open the matching Windows or macro setting.",
          "Correct it without changing unrelated settings.",
          "Rerun the check before starting a long session."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "precheck",
      "diagnostics",
      "ocr",
      "resolution",
      "scaling",
      "dependencies"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "discord-statistics",
    "category": "Community",
    "title": "Discord session statistics",
    "summary": "Understand OCR-based session information sent to Discord.",
    "sections": [
      {
        "title": "Enable the report",
        "paragraphs": [],
        "steps": [
          "Create a private Discord webhook.",
          "Enable the webhook from the macro's Discord tab.",
          "Select Send Statistics.",
          "Use Test Webhook, then check a live match update."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "What numbers mean",
        "paragraphs": [
          "Statistics are read with OCR. If a value is wrong, fix Windows OCR and Roblox fonts before treating it as a Discord problem."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "discord",
      "statistics",
      "currency",
      "session",
      "ocr",
      "send"
    ],
    "source": "/guide/discord/",
    "version": "v1.3.x"
  },
  {
    "slug": "discord-screenshot-reports",
    "category": "Community",
    "title": "Discord screenshot notifications",
    "summary": "Use periodic and result-screen screenshots to follow a run.",
    "sections": [
      {
        "title": "Available images",
        "paragraphs": [
          "Automatic screenshots can be sent periodically; Triumph and Loss screenshots capture the end-of-match result screen. The result images can use a second webhook."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Privacy check",
        "paragraphs": [],
        "steps": [
          "Choose a private channel.",
          "Enable the screenshot types you want.",
          "Check a test result for user names or other personal details.",
          "Share only redacted examples with public support."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "discord",
      "screenshot",
      "triumphant",
      "loss",
      "periodic",
      "private",
      "webhook"
    ],
    "source": "/guide/discord/",
    "version": "v1.3.x"
  },
  {
    "slug": "discord-webhook-security",
    "category": "Community",
    "title": "Keep Discord webhook URLs private",
    "summary": "A leaked webhook can be used to post into your channel.",
    "sections": [
      {
        "title": "Before sharing configuration",
        "paragraphs": [],
        "steps": [
          "Do not paste a webhook URL into a public issue or Discord message.",
          "Redact the URL from screenshots and logs.",
          "Use a private channel for the macro's screenshots and session events.",
          "If leaked, delete or regenerate the webhook in Discord and update the macro settings."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "webhook",
      "security",
      "leaked",
      "exposed",
      "tokens",
      "credentials"
    ],
    "source": "/guide/discord/",
    "version": "v1.3.x"
  },
  {
    "slug": "engineerbot-commands",
    "category": "Community",
    "title": "EngineerBot remote commands",
    "summary": "Supported remote start, stop, screenshot and status controls.",
    "sections": [
      {
        "title": "Supported actions",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Start / stop",
            "Control the macro remotely"
          ],
          [
            "Status",
            "Query current macro state"
          ],
          [
            "Screenshot",
            "Inspect what the Windows PC shows"
          ],
          [
            "Version / stats / logs",
            "Fetch relevant diagnostics"
          ],
          [
            "Selected strategy",
            "Query the active strategy"
          ]
        ]
      },
      {
        "title": "Before trusting remote stop",
        "paragraphs": [
          "Test local F2 control first and verify the bot's connection. Discord connectivity cannot repair a broken local macro session."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "discord",
      "engineerbot",
      "remote",
      "control",
      "commands"
    ],
    "source": "/guide/discord/",
    "version": "v1.3.x"
  },
  {
    "slug": "profile-export",
    "category": "Sessions & tools",
    "title": "Export a working profile",
    "summary": "Back up settings, hotkeys and strategies in one bundle.",
    "sections": [
      {
        "title": "Before changing versions",
        "paragraphs": [],
        "steps": [
          "Open Profile Manager.",
          "Export the working settings, hotkeys and strategies.",
          "Save the file somewhere outside the release folder.",
          "Check the backup exists before editing or importing another setup."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Check what was actually protected",
        "paragraphs": [
          "A profile export alone is not proof that every file in the installation folder is backed up. User recordings and bundled strategies have separate locations in v1.3.5."
        ],
        "steps": [
          "Keep the exported profile outside the release folder you may replace.",
          "Copy saved recordings from %APPDATA%\\Ultimate_Macro\\Recordings if that folder exists.",
          "Back up any edited strategy files from Resources\\Strats in the release folder.",
          "Check that the exported profile and separate copies exist before changing versions or importing."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "profile",
      "manager",
      "export",
      "backup",
      "strategies",
      "hotkeys"
    ],
    "source": "/guide/discord/",
    "version": "v1.3.x"
  },
  {
    "slug": "profile-import",
    "category": "Sessions & tools",
    "title": "Import a profile safely",
    "summary": "Restore a bundle without losing your current setup.",
    "sections": [
      {
        "title": "Protect the existing profile",
        "paragraphs": [],
        "steps": [
          "Export your current working profile first.",
          "Open Profile Manager and select Import.",
          "Review its preview of settings, hotkeys and strategies.",
          "Confirm the intended replacements and keep a backup.",
          "Test one strategy after importing."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "profile",
      "manager",
      "import",
      "preview",
      "backup",
      "restore"
    ],
    "source": "/guide/discord/",
    "version": "v1.3.x"
  },
  {
    "slug": "tools-hotkeys",
    "category": "Sessions & tools",
    "title": "Tools shortcuts: F3 and F4",
    "summary": "Start and stop the separate tools from their own windows.",
    "sections": [
      {
        "title": "Tool controls",
        "paragraphs": [
          "The Tools tab opens utilities in always-on-top windows. F3 starts the selected tool and F4 stops it."
        ],
        "steps": [
          "Choose Auto Call of Arms, Auto Spin or Auto Open Consumable.",
          "Open the tool's window.",
          "Press F3 to begin its task.",
          "Press F4 to stop it."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "tools",
      "f3",
      "f4",
      "start",
      "stop",
      "spin",
      "consumable",
      "call",
      "of",
      "arms"
    ],
    "source": "/guide/tools/",
    "version": "v1.3.x"
  },
  {
    "slug": "auto-call-of-arms",
    "category": "Sessions & tools",
    "title": "Auto Call of Arms",
    "summary": "Run supported abilities at configured intervals.",
    "sections": [
      {
        "title": "Set up intervals",
        "paragraphs": [],
        "steps": [
          "Open Tools → Auto Call of Arms.",
          "Choose the Call of Arms and Drop the Beat ability options.",
          "Set each desired interval in seconds.",
          "Make sure the Settings keybinds match TDS.",
          "Press F3 to start and F4 to stop."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Important",
        "paragraphs": [
          "Either ability can be disabled independently. The tool cannot activate an unavailable in-game ability."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "auto",
      "call",
      "of",
      "arms",
      "drop",
      "the",
      "beat",
      "interval",
      "seconds"
    ],
    "source": "/guide/tools/",
    "version": "v1.3.x"
  },
  {
    "slug": "auto-spin",
    "category": "Sessions & tools",
    "title": "Auto Spin",
    "summary": "Automate the spinning wheel with the separate Auto Spin tool.",
    "sections": [
      {
        "title": "Using Auto Spin",
        "paragraphs": [],
        "steps": [
          "Open Tools → Auto Spin.",
          "Check the spin interface is available in TDS.",
          "Press F3 to start the tool.",
          "Monitor the ticket count while it runs.",
          "Press F4 to stop."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Counter",
        "paragraphs": [
          "The documented tool counts how many tickets were used."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "auto",
      "spin",
      "wheel",
      "tickets",
      "f3",
      "f4"
    ],
    "source": "/guide/tools/",
    "version": "v1.3.x"
  },
  {
    "slug": "auto-consumable",
    "category": "Sessions & tools",
    "title": "Auto Open Consumable",
    "summary": "Use the standalone crate-opening utility.",
    "sections": [
      {
        "title": "Opening consumables",
        "paragraphs": [],
        "steps": [
          "Open Tools → Auto Open Consumable.",
          "Confirm the intended consumables are available.",
          "Press F3 to start opening crates.",
          "Watch the count and stop with F4."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Counter",
        "paragraphs": [
          "The tool reports how many crates it opened."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "auto",
      "open",
      "consumable",
      "crates",
      "f3",
      "f4"
    ],
    "source": "/guide/tools/",
    "version": "v1.3.x"
  },
  {
    "slug": "legacy-resolution",
    "category": "Troubleshooting",
    "title": "Legacy Mode and resolution limits",
    "summary": "Why Legacy Mode is a fallback for display detection.",
    "sections": [
      {
        "title": "Known limitation",
        "paragraphs": [
          "The public setup guide warns that Legacy Mode can retain 1920×1080 limitations and disables Auto Equip and target changes. Use adaptive detection when possible."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Test",
        "paragraphs": [],
        "steps": [
          "Check whether Legacy Mode is enabled.",
          "Disable it if Auto Equip or target changes are needed.",
          "Use a supported 16:9 resolution; test at 1920×1080 if troubleshooting.",
          "Retest with a bundled strategy before returning to long runs."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "legacy",
      "mode",
      "1080p",
      "resolution",
      "fallback",
      "image",
      "detection"
    ],
    "source": "/guide/troubleshooting/",
    "version": "v1.3.x"
  },
  {
    "slug": "ocr-language-fix",
    "category": "Troubleshooting",
    "title": "Install missing OCR language",
    "summary": "Correct text detection when English (US) OCR support is absent.",
    "sections": [
      {
        "title": "Windows requirement",
        "paragraphs": [
          "Ultimate Macro uses Windows OCR for currency, wave numbers and result screens."
        ],
        "steps": [
          "Install the English (United States) Windows OCR language pack.",
          "Reopen Ultimate Macro after installation.",
          "Remove any custom Roblox fonts.",
          "Compare a live wave/currency value against the macro's detection."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "When reporting",
        "paragraphs": [
          "Include a cropped screenshot of the value being read incorrectly, the resolution, scaling and release version."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "ocr",
      "install",
      "english",
      "us",
      "windows",
      "language"
    ],
    "source": "/guide/troubleshooting/",
    "version": "v1.3.x"
  },
  {
    "slug": "tower-path-keybind-fix",
    "category": "Troubleshooting",
    "title": "Bottom-path upgrade key mismatch",
    "summary": "Check the macro's upgrade and bottom path bindings.",
    "sections": [
      {
        "title": "Check the keys",
        "paragraphs": [
          "The setup guide lists E for Upgrade and Z for Bottom path as defaults."
        ],
        "steps": [
          "Open TDS and check its current upgrade and path shortcuts.",
          "Open Ultimate Macro Settings → TDS Keybinds.",
          "Make the matching keys identical.",
          "Enable TDS Prefer Vertical Upgrades.",
          "Replay one upgrade and verify the intended path."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "upgrade",
      "bottom",
      "path",
      "z",
      "e",
      "keybind"
    ],
    "source": "/guide/troubleshooting/",
    "version": "v1.3.x"
  },
  {
    "slug": "debug-logs-export",
    "category": "Troubleshooting",
    "title": "Capture debug logs for support",
    "summary": "Record the event around a failure without sharing private data.",
    "sections": [
      {
        "title": "Reproduce and collect",
        "paragraphs": [],
        "steps": [
          "Open Settings and enable Debug Logs.",
          "Run until the failure happens once.",
          "Note the last successful action and the action that should have followed.",
          "Collect the relevant local log excerpt, with personal information removed.",
          "Include macro version, Windows resolution and screen scaling in the support report."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "What makes a report useful",
        "paragraphs": [
          "A short reproducible log is more useful than an entire unrelated session history."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "debug",
      "logs",
      "export",
      "support",
      "repro",
      "screenshot",
      "error"
    ],
    "source": "/guide/troubleshooting/",
    "version": "v1.3.x"
  },
  {
    "slug": "strategy-lab-start",
    "category": "Strategies",
    "title": "Open Strategy Lab",
    "summary": "Launch the visual .strat editor from the Create tab or release folder.",
    "sections": [
      {
        "title": "Two entry points",
        "paragraphs": [],
        "steps": [
          "Open Ultimate Macro and select Create → Open Strategy Lab or Edit a Strategy.",
          "Alternatively, run StrategyLab.exe from the fully extracted release folder.",
          "Open a copy of the .strat you want to inspect."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Backup",
        "paragraphs": [
          "Strategy Lab is a visual editor. Save a backup before changing the original strategy file."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "strategy",
      "lab",
      "exe",
      "create",
      "edit",
      "open",
      "visual"
    ],
    "source": "/guide/recording/",
    "version": "v1.3.x"
  },
  {
    "slug": "public-release-reference",
    "category": "Community",
    "title": "Version-specific release notes",
    "summary": "Use release notes to understand changed behavior across builds.",
    "sections": [
      {
        "title": "Find source-of-truth details",
        "paragraphs": [],
        "steps": [
          "Open the official GitHub Releases page.",
          "Find the tag matching the installation you're using.",
          "Read its new features, improvements and bug fixes.",
          "Compare an observed behavior with the release it was introduced or fixed in."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Avoid guessing",
        "paragraphs": [
          "A feature described for one release may not exist in older versions. The current wiki baseline documents public v1.3.x behavior."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "versions",
      "releases",
      "changelog",
      "changes",
      "tags",
      "fixes"
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases",
    "version": "v1.3.x"
  },
  {
    "slug": "resolution-adaptive",
    "category": "Setup & settings",
    "title": "Adaptive resolution support",
    "summary": "Supported 16:9 display sizes and the recommended baseline.",
    "sections": [
      {
        "title": "Supported displays",
        "paragraphs": [
          "The public 1.3.5 release supports resolution-aware image detection from 720p through 4K, with 8K scaling included. The guide lists the supported 16:9 range from 1280×720 through 3840×2160."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Baseline for troubleshooting",
            "1920×1080 at 100% scale"
          ],
          [
            "Resolution aspect ratio",
            "16:9"
          ],
          [
            "Taskbar",
            "Visible, not auto-hidden"
          ]
        ]
      },
      {
        "title": "If actions miss",
        "paragraphs": [
          "Confirm your resolution, scaling and Roblox window placement first. Increasing timing delays does not fix consistently wrong coordinates."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "adaptive",
      "resolution",
      "720p",
      "1080p",
      "1440p",
      "4k",
      "image",
      "scale"
    ],
    "source": "/guide/display/",
    "version": "v1.3.x"
  },
  {
    "slug": "macro-account-free",
    "category": "Start here",
    "title": "Do I need an account?",
    "summary": "Account requirements for the public v1.3.x local macro.",
    "sections": [
      {
        "title": "Public v1.3.x behavior",
        "paragraphs": [
          "The published setup guide states that Ultimate Macro runs locally and does not require an account."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Check before a new version",
        "paragraphs": [
          "Account behavior may change in later builds. Follow the release notes for the installed version rather than assuming this is permanent."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "account",
      "login",
      "registration",
      "required",
      "local",
      "free"
    ],
    "source": "/guide/requirements/",
    "version": "v1.3.x"
  },
  {
    "slug": "party-host",
    "category": "Sessions & tools",
    "title": "Host a TDS party",
    "summary": "Configure the Host role and invitation names.",
    "sections": [
      {
        "title": "Host setup",
        "paragraphs": [],
        "steps": [
          "Open the Party tab and choose Host.",
          "Enter the members' account names.",
          "Choose when to return to the lobby, when all members or any member leaves.",
          "Save the party configuration.",
          "Test with the other accounts present before an unattended run."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "party",
      "host",
      "invite",
      "players",
      "member",
      "names"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "party-member",
    "category": "Sessions & tools",
    "title": "Join as a party member",
    "summary": "Configure the Member role to wait for a host invitation.",
    "sections": [
      {
        "title": "Member setup",
        "paragraphs": [],
        "steps": [
          "Open the Party tab and choose Member.",
          "Enter the host's display name.",
          "Choose the expected leave/rejoin behavior.",
          "Save, then wait for the host invitation.",
          "Verify all accounts entered the same match."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "party",
      "member",
      "host",
      "invite",
      "display",
      "name"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  },
  {
    "slug": "vip-server-link",
    "category": "Sessions & tools",
    "title": "Use a VIP server link",
    "summary": "Configure a Roblox private server for macro runs.",
    "sections": [
      {
        "title": "VIP server setup",
        "paragraphs": [],
        "steps": [
          "Check that the account has access to the intended server.",
          "Copy the private server link.",
          "Paste it into VIP Server Link.",
          "Enable Use VIP Server.",
          "Join and verify the correct experience before a long run."
        ],
        "checks": [],
        "rows": []
      }
    ],
    "keywords": [
      "vip",
      "private",
      "server",
      "link",
      "toggle"
    ],
    "source": "/guide/sessions/",
    "version": "v1.3.x"
  }
];
