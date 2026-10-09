// v1.3.5 documentation checked against the tagged public Main.ahk source.
export const sourceVerifiedArticles = [
  {
    "slug": "where-settings-are-saved",
    "category": "Setup & settings",
    "title": "Where Ultimate Macro stores settings",
    "summary": "Find the Windows AppData files used by the public v1.3.5 macro.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "appdata",
      "settings",
      "path",
      "options",
      "ini",
      "tds",
      "folder"
    ],
    "sections": [
      {
        "title": "Options folder",
        "paragraphs": [
          "The released Main.ahk sets the options directory to %APPDATA%\\Ultimate_Macro\\Options and reads its primary configuration from Settings.tds."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Macro settings",
            "%APPDATA%\\Ultimate_Macro\\Options\\Settings.tds"
          ],
          [
            "Discord bot settings",
            "%APPDATA%\\Ultimate_Macro\\Options\\Discord-Bot-Settings.ini"
          ],
          [
            "Runtime state",
            "%APPDATA%\\Ultimate_Macro\\state.ini"
          ]
        ]
      },
      {
        "title": "Inspect without changing anything",
        "paragraphs": [],
        "steps": [
          "Press Win + R, enter %APPDATA%\\Ultimate_Macro and press Enter.",
          "Open Options to locate Settings.tds.",
          "Copy the file to a separate backup folder before inspecting or editing it.",
          "Never share your bot settings file publicly; it can contain credentials."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "where-recordings-are-saved",
    "category": "Strategies",
    "title": "Where strategy recordings are saved",
    "summary": "Find personal .strat recordings and the bundled strategy directory.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "recordings",
      "strat",
      "path",
      "save",
      "custom",
      "bundled"
    ],
    "sections": [
      {
        "title": "Two different directories",
        "paragraphs": [
          "The released Main.ahk defines a user-specific Recordings folder and a separate Resources\\Strats folder next to the macro."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Recorded strategies",
            "%APPDATA%\\Ultimate_Macro\\Recordings"
          ],
          [
            "Bundled strategy files",
            "<macro folder>\\Resources\\Strats"
          ]
        ]
      },
      {
        "title": "Find your files",
        "paragraphs": [],
        "steps": [
          "Press Win + R and open %APPDATA%\\Ultimate_Macro\\Recordings.",
          "Sort by modification date to find your latest recording.",
          "For bundled strategies, open the extracted macro folder, then Resources and Strats.",
          "Make a copy of any strategy before editing it in Strategy Lab."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "where-profiles-are-saved",
    "category": "Sessions & tools",
    "title": "Where profile backups are saved",
    "summary": "Identify the local profile directory before importing or resetting settings.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "profile",
      "backup",
      "path",
      "appdata",
      "import"
    ],
    "sections": [
      {
        "title": "Storage location",
        "paragraphs": [
          "The v1.3.5 source creates %APPDATA%\\Ultimate_Macro\\Profiles when missing."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Profile directory",
            "%APPDATA%\\Ultimate_Macro\\Profiles"
          ]
        ]
      },
      {
        "title": "Back up before importing",
        "paragraphs": [],
        "steps": [
          "Open the directory through Win + R.",
          "Make a copy of the profile you plan to import.",
          "Use Profile Manager’s import preview before accepting replacements.",
          "Test a short strategy after restoring a profile."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "what-reset-settings-changes",
    "category": "Setup & settings",
    "title": "What Reset to Default actually changes",
    "summary": "The reset action affects settings and hotkeys, not your strategies or Discord setup.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "reset",
      "defaults",
      "settings",
      "hotkeys",
      "strategies"
    ],
    "sections": [
      {
        "title": "Included in reset",
        "paragraphs": [
          "The confirmation dialog in Main.ahk explicitly says it resets TDS keybinds, recording hotkeys, macro settings and advanced settings."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "TDS keybinds",
            "Reset"
          ],
          [
            "Recording hotkeys",
            "Reset"
          ],
          [
            "Macro and advanced settings",
            "Reset"
          ],
          [
            "Strategies",
            "Not touched"
          ],
          [
            "Party settings",
            "Not touched"
          ],
          [
            "Discord settings",
            "Not touched"
          ],
          [
            "VIP server link",
            "Not touched"
          ]
        ]
      },
      {
        "title": "Use the reset safely",
        "paragraphs": [],
        "steps": [
          "Back up %APPDATA%\\Ultimate_Macro\\Options\\Settings.tds.",
          "Open Settings and choose Reset to Default.",
          "Read the confirmation dialog before accepting.",
          "Check keybinds and delays after the reset; run a supervised test match."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "recording-hotkey-defaults",
    "category": "Strategies",
    "title": "Default strategy recording hotkeys",
    "summary": "The exact v1.3.5 shortcut defaults from the reset-settings map.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "record",
      "hotkey",
      "shortcuts",
      "ctrl",
      "bindings",
      "dj"
    ],
    "sections": [
      {
        "title": "Default recorder shortcuts",
        "paragraphs": [
          "A caret (^) in the AutoHotkey source denotes Ctrl; plus denotes Shift, and exclamation denotes Alt."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Place Tower",
            "F"
          ],
          [
            "Upgrade Tower",
            "Ctrl + U"
          ],
          [
            "Align Camera",
            "Ctrl + T"
          ],
          [
            "Change DJ Track",
            "Ctrl + D"
          ],
          [
            "Sell Tower",
            "Ctrl + X"
          ],
          [
            "Delete last recording",
            "Ctrl + B"
          ],
          [
            "Record inputs",
            "Ctrl + Shift + E"
          ],
          [
            "Hologram",
            "Ctrl + Alt + H"
          ]
        ]
      },
      {
        "title": "If a shortcut does nothing",
        "paragraphs": [],
        "steps": [
          "Open Settings → Recording Hotkeys.",
          "Compare your current keys with the list above; a customized profile can change them.",
          "Make sure Roblox has keyboard focus and the recorder is active.",
          "Test one action and verify it was captured before completing a full strategy."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "enforcer-van-hotkey",
    "category": "Setup & settings",
    "title": "Enforcer SWAT Van keybind",
    "summary": "Check the v1.3.5 SWAT Van default and how to record it.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "enforcer",
      "swat",
      "van",
      "ability",
      "key",
      "n"
    ],
    "sections": [
      {
        "title": "Default",
        "paragraphs": [
          "In the released Settings hotkey map, EnforcerVan defaults to N. This is separate from the other tower ability keys."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "SWAT Van",
            "N"
          ]
        ]
      },
      {
        "title": "Recording",
        "paragraphs": [
          "The Main.ahk tooltip says to hold Ctrl with the configured SWAT Van ability key during recording."
        ],
        "steps": [
          "Check the game’s current ability keybind.",
          "Set the same key in Settings → TDS Keybinds.",
          "During recording press Ctrl with that key to capture the ability.",
          "Replay a short match to verify the action occurred."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "upgrade-hotkeys-setting",
    "category": "Setup & settings",
    "title": "Use Hotkeys for Upgrading",
    "summary": "Understand the switch that changes how the macro upgrades towers.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "upgrade",
      "hotkey",
      "use",
      "upgrading",
      "panel"
    ],
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "When enabled, the macro presses TDS’s upgrade key instead of clicking the upgrade panel. The released tooltip explicitly recommends enabling it."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Check the setup",
        "paragraphs": [],
        "steps": [
          "In Settings, enable Use Hotkeys for Upgrading.",
          "Confirm your TDS Upgrade key matches Ultimate Macro's TDS Keybinds.",
          "Make sure Prefer Vertical Upgrades is enabled in TDS.",
          "Test one top-path and one bottom-path upgrade."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Don't confuse delay and keybind problems",
        "paragraphs": [
          "An upgrade that selects the wrong path requires checking vertical upgrades and keys first; a panel that opens late is a timing issue."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "timescale-when-tickets-run-out",
    "category": "Sessions & tools",
    "title": "What happens when Timescale tickets run out",
    "summary": "The documented fallback behavior in the released Settings tooltip.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "timescale",
      "ticket",
      "speed",
      "1.5",
      "2",
      "fallback"
    ],
    "sections": [
      {
        "title": "Automatic fallback",
        "paragraphs": [
          "The v1.3.5 Main.ahk tooltip states that if Timescale tickets run out, the run continues at normal speed."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "1.5×",
            "More stable, suits most strategies"
          ],
          [
            "2×",
            "Requires a strategy built for 2× timing"
          ],
          [
            "No tickets left",
            "Continues at normal speed"
          ]
        ]
      },
      {
        "title": "If the match appears slow",
        "paragraphs": [],
        "steps": [
          "Check whether tickets are still available in TDS.",
          "Check the TimeScale setting in Ultimate Macro.",
          "Compare the strategy's intended speed against the actual speed.",
          "Test under supervision before assuming a macro freeze."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "upgrade-delay-milliseconds",
    "category": "Setup & settings",
    "title": "What Upgrade Delay means",
    "summary": "Why lowering the delay may cause skipped upgrades or wrong paths.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "upgrade",
      "delay",
      "milliseconds",
      "performance",
      "skipped"
    ],
    "sections": [
      {
        "title": "Exact behavior",
        "paragraphs": [
          "The v1.3.5 tooltip defines Upgrade Delay as the wait, in milliseconds, between two upgrade presses on the same tower."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Unit",
            "Milliseconds"
          ],
          [
            "Reset default",
            "200 ms"
          ],
          [
            "Too low",
            "May skip upgrades or land on the wrong path if the game cannot keep up"
          ]
        ]
      },
      {
        "title": "Safe tuning",
        "paragraphs": [],
        "steps": [
          "Record the current Upgrade Delay value before changing it.",
          "Increase it slightly if repeated upgrades are missed on a slower game.",
          "Replay the same strategy and verify the upgrade path.",
          "Only keep the change if the missed-action rate improves."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "legacy-mode-exact-limits",
    "category": "Setup & settings",
    "title": "Legacy Mode: exact limits",
    "summary": "What Legacy Mode changes and which features it disables.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "legacy",
      "resolution",
      "auto",
      "equip",
      "targeting"
    ],
    "sections": [
      {
        "title": "Released behavior",
        "paragraphs": [
          "The v1.3.5 tooltip says Legacy Mode changes image detection and applies only to 1920×1080. Auto Equip and tower targeting are unavailable while it is enabled."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Required resolution",
            "1920×1080"
          ],
          [
            "Auto Equip",
            "Unavailable"
          ],
          [
            "Tower targeting",
            "Unavailable"
          ],
          [
            "Changing setting",
            "Restarts macro"
          ]
        ]
      },
      {
        "title": "When troubleshooting",
        "paragraphs": [],
        "steps": [
          "Confirm whether Legacy Mode is enabled.",
          "Use the adaptive mode first if you need Auto Equip or tower targeting.",
          "If testing Legacy Mode, set Windows to 1920×1080 and verify the run.",
          "Return to adaptive mode if required features disappear."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "export-debug-logs",
    "category": "Troubleshooting",
    "title": "Export logs from the Settings page",
    "summary": "Use the built-in Export Logs button for reproducible error reports.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "logs",
      "export",
      "debug",
      "report",
      "developer"
    ],
    "sections": [
      {
        "title": "Where it is",
        "paragraphs": [
          "In v1.3.5 the Settings panel includes an Export Logs button wired to ExportLogsForDevelopers."
        ],
        "steps": [
          "Enable Debug Logs when investigating a problem.",
          "Reproduce the failure in one short session.",
          "Open Settings and select Export Logs.",
          "Inspect the exported material and remove account names, paths or tokens before sharing it."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "What to include",
        "paragraphs": [
          "Report the macro version, game mode, resolution, scaling, expected action and observed result. The log should support the report, not replace the reproduction steps."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "macro-settings-autosave",
    "category": "Setup & settings",
    "title": "When settings are saved",
    "summary": "Understand how the public macro persists configuration changes.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "autosave",
      "save",
      "settings",
      "persistent",
      "appdata"
    ],
    "sections": [
      {
        "title": "Auto-save",
        "paragraphs": [
          "The v1.3.5 source wires settings auto-save controls and writes settings to the Options folder in AppData."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Verify a change",
        "paragraphs": [],
        "steps": [
          "Change one non-sensitive setting in the macro UI.",
          "Close and relaunch the macro normally.",
          "Return to Settings and verify that the value persisted.",
          "If not, inspect file permissions for %APPDATA%\\Ultimate_Macro\\Options and gather the exact error."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "restart-vs-play-again",
    "category": "Sessions & tools",
    "title": "When to use Restart versus Play Again",
    "summary": "The exact end-of-match distinction used by the released macro.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "restart",
      "play",
      "again",
      "win",
      "loss",
      "map"
    ],
    "sections": [
      {
        "title": "Different result screens",
        "paragraphs": [
          "The Settings tooltips state that Click Restart acts after a loss, while Click Play Again acts after a win."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Restart",
            "After a loss"
          ],
          [
            "Play Again",
            "After a win"
          ]
        ]
      },
      {
        "title": "Wrong map after a win",
        "paragraphs": [
          "The source specifically recommends turning Restart off if a winning strategy sometimes ends on the wrong map."
        ],
        "steps": [
          "Check what result the game displayed.",
          "Confirm whether the macro clicked Restart or Play Again.",
          "For a win-only strategy with the wrong destination, test disabling Restart.",
          "Watch the next match's map selection before leaving the PC."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "resolution-mode-requirements",
    "category": "Setup & settings",
    "title": "Adaptive display versus Legacy Mode",
    "summary": "Know when a supported 16:9 resolution is enough and when 1080p is required.",
    "version": "v1.3.5",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "resolution",
      "adaptive",
      "legacy",
      "1440p",
      "720p",
      "scaling"
    ],
    "sections": [
      {
        "title": "Display expectations",
        "paragraphs": [
          "Release v1.3.5 supports adaptive image detection across supported 16:9 resolutions, but Legacy Mode specifically requires 1920×1080."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Adaptive detection",
            "Supported 16:9 resolutions"
          ],
          [
            "Legacy Mode",
            "1920×1080 only"
          ],
          [
            "Troubleshooting baseline",
            "1920×1080 at 100% scaling"
          ]
        ]
      },
      {
        "title": "Coordinate mismatch check",
        "paragraphs": [],
        "steps": [
          "Check Windows display resolution and scaling.",
          "Check the Roblox window size and that it has not moved.",
          "Confirm whether Legacy Mode is enabled.",
          "Try a first-match placement test before changing timing delays."
        ],
        "checks": [],
        "rows": []
      }
    ]
  }
];
