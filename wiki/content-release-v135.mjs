export const releaseVerifiedArticles = [
  {
    "slug": "release-asset-integrity",
    "category": "Start here",
    "title": "Verify the official ZIP and checksum",
    "summary": "Compare the packaged release asset against its published SHA-256 digest.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk",
    "keywords": [
      "download",
      "sha256",
      "checksum",
      "zip",
      "verify",
      "official"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Identify the release asset",
        "paragraphs": [
          "The updater source checks the latest stable GitHub release and looks for a ZIP with the expected name and SHA-256 digest."
        ],
        "steps": [
          "Open the official GitHub Releases page.",
          "Choose the release matching your intended version.",
          "Download the attached ZIP, not a file reposted by another account.",
          "Check the digest associated with that specific release asset."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Verify locally",
        "paragraphs": [
          "Run this in PowerShell from the download folder and compare the hexadecimal result with the published digest."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Command",
            "Get-FileHash -Algorithm SHA256 .\\TDS.Macro.v1.3.5.zip"
          ],
          [
            "Pass condition",
            "The hashes match exactly"
          ]
        ]
      },
      {
        "title": "When to stop",
        "paragraphs": [
          "If the digest is missing or the hash differs, do not bypass verification with a random replacement archive."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "updater-filename-mismatch",
    "category": "Troubleshooting",
    "title": "Updater doesn't recognize the newest release ZIP",
    "summary": "The v1.3.5 updater expects a filename that differs from its published ZIP asset.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk",
    "keywords": [
      "updater",
      "file",
      "name",
      "mismatch",
      "TDS_Macro",
      "zip",
      "v135"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Confirmed source versus release",
        "paragraphs": [
          "The v1.3.5 updater sets PreferredAsset to TDS_Macro.zip, while the published v1.3.5 asset is named TDS.Macro.v1.3.5.zip. The exact-name comparison can prevent this updater implementation from finding that release asset."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Expected by code",
            "TDS_Macro.zip"
          ],
          [
            "Published v1.3.5 ZIP",
            "TDS.Macro.v1.3.5.zip"
          ],
          [
            "Symptom",
            "Update check may silently return without offering an update"
          ]
        ]
      },
      {
        "title": "What users should do",
        "paragraphs": [],
        "steps": [
          "Check which version is installed; if it is already v1.3.5, there is no newer stable v1.3.5 update to install.",
          "Visit official GitHub Releases and verify whether a newer stable tag exists.",
          "If updating manually, use the official asset and preserve your strategies and settings.",
          "Report the filename mismatch to maintainers so the updater can be fixed in a release."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Do not workaround by",
        "paragraphs": [
          "Do not rename or spoof a GitHub release asset locally to force the updater or disable its integrity validation."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "release-prereleases",
    "category": "Start here",
    "title": "Know whether a release is stable or prerelease",
    "summary": "Read Github's stable release feed as the macro updater does.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk",
    "keywords": [
      "stable",
      "prerelease",
      "github",
      "latest",
      "release",
      "versions"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "The source endpoint",
        "paragraphs": [
          "The v1.3.5 updater calls GitHub's /releases/latest endpoint, which selects the latest stable published release rather than unreleased tester builds."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Stable releases",
            "Look for the public release tag and a ZIP asset"
          ],
          [
            "Tester/prerelease",
            "Follow explicit tester instructions; don't assume the updater uses it"
          ]
        ]
      },
      {
        "title": "Before switching builds",
        "paragraphs": [],
        "steps": [
          "Check release date, version tag and published channel.",
          "Preserve the current .strat files and profile export.",
          "Read the release notes for settings or compatibility changes.",
          "Do a supervised test run after switching builds."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "safe-update-validation",
    "category": "Sessions & tools",
    "title": "What safe update verifies before installing",
    "summary": "Understand downloaded staging files, checksums and rollback support.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/safe_update.ps1",
    "keywords": [
      "update",
      "staged",
      "sha256",
      "rollback",
      "safe",
      "zip",
      "preserved",
      "strategies"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "The update sequence",
        "paragraphs": [
          "The updater downloads a release to staging, compares its SHA-256 with the release digest and validates the archive before replacing existing files. Backup and rollback logic are in the release package."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Before updating",
            "Working version and custom strategies should remain backed up"
          ],
          [
            "Verification",
            "SHA-256 and package structure checks"
          ],
          [
            "Recovery",
            "Existing backup/rollback path rather than unchecked overwrite"
          ]
        ]
      },
      {
        "title": "When the update fails",
        "paragraphs": [],
        "steps": [
          "Leave the current installation folder intact.",
          "Save the full error message.",
          "Determine whether the download, checksum or extracted-file validation failed.",
          "Retry only after the asset issue is resolved."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "auto-roblox-settings-reference",
    "category": "Setup & settings",
    "title": "Auto Configure: actual Roblox settings",
    "summary": "A source-backed reference for the Roblox values applied by Auto Configure.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/auto_settings.ahk",
    "keywords": [
      "roblox",
      "auto",
      "configure",
      "framerate",
      "chat",
      "camera",
      "ui",
      "graphics"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Settings applied by source",
        "paragraphs": [
          "The feature writes selected named fields in Roblox's GlobalBasicSettings_13.xml. These are not arbitrary performance recommendations; they are the values encoded in v1.3.5."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "FramerateCap",
            "60"
          ],
          [
            "Fullscreen",
            "false"
          ],
          [
            "UiNavigationKeyBindEnabled",
            "true"
          ],
          [
            "GraphicsQualityLevel",
            "1"
          ],
          [
            "CameraMode",
            "0"
          ],
          [
            "ChatVisible",
            "false"
          ],
          [
            "PlayerListVisible",
            "false"
          ],
          [
            "PerformanceStatsVisible",
            "true"
          ]
        ]
      },
      {
        "title": "Avoid overriding by hand",
        "paragraphs": [
          "The macro stores a backup and provenance metadata to restore the previous state safely. Hand-editing the XML while Auto Configure is active can interfere with that restoration."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "auto-roblox-settings-backup",
    "category": "Setup & settings",
    "title": "Where Auto Configure saves its backup",
    "summary": "Locate the original XML backup, metadata, and error log.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/auto_settings.ahk",
    "keywords": [
      "roblox",
      "auto",
      "configure",
      "xml",
      "localappdata",
      "backup",
      "meta"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "File locations",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Original",
            "%LOCALAPPDATA%\\Roblox\\GlobalBasicSettings_13.xml"
          ],
          [
            "Backup",
            "GlobalBasicSettings_13.xml.macro_bak"
          ],
          [
            "Metadata",
            "GlobalBasicSettings_13.xml.macro_bak.meta"
          ],
          [
            "Error log",
            "GlobalBasicSettings_13.xml.macro_error.log"
          ]
        ]
      },
      {
        "title": "Before investigating",
        "paragraphs": [],
        "steps": [
          "Close Roblox before attempting a restore.",
          "Make a copy of the XML, backup and metadata files.",
          "Read the .macro_error.log text without exposing sensitive folder information.",
          "Report the failure reason and installed macro version."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "auto-roblox-restore-refused",
    "category": "Troubleshooting",
    "title": "Auto Configure refuses to restore Roblox settings",
    "summary": "Investigate the mismatch without destroying the original backup.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/auto_settings.ahk",
    "keywords": [
      "settings",
      "restore",
      "refused",
      "provenance",
      "metadata",
      "changed",
      "xml"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Why the restore can stop",
        "paragraphs": [
          "The restore path validates the original backup and metadata. It can refuse restoration when the current XML no longer matches the verified backup or macro-applied state."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Expected safety behavior",
            "Refuse uncertain file replacement"
          ],
          [
            "Do not do",
            "Delete metadata or overwrite XML to bypass verification"
          ]
        ]
      },
      {
        "title": "Safest diagnosis",
        "paragraphs": [],
        "steps": [
          "Stop Roblox and the macro.",
          "Preserve the XML and .macro_bak files.",
          "Read the .macro_error.log file for the exact mismatch.",
          "Include that message in a report; wait for a verified recovery procedure before forcing a replacement."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "profile-export-ump-reference",
    "category": "Sessions & tools",
    "title": "What's inside an exported .ump profile",
    "summary": "Review metadata, strategy contents, option groups and privacy.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/Profiles.ahk",
    "keywords": [
      "ump",
      "export",
      "profile",
      "strategies",
      "json",
      "settings",
      "metadata"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Profile format",
        "paragraphs": [
          "The source writes an UTF-8 JSON-based .ump file containing export metadata, selected settings groups and optional strategy file contents."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Extension",
            ".ump"
          ],
          [
            "Metadata",
            "macroVersion, createdAt, name, description"
          ],
          [
            "Optional groups",
            "Options, Hotkeys, RecordingHotkeys"
          ],
          [
            "Strategy entries",
            "File names and text contents for selected strategy paths"
          ]
        ]
      },
      {
        "title": "Before sharing",
        "paragraphs": [
          "The export may contain sensitive configuration, and included strategy files may be private. Prefer a redacted log excerpt over sharing your whole profile to public support."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "profile-selective-groups",
    "category": "Sessions & tools",
    "title": "Export only selected profile groups",
    "summary": "Choose what a .ump backup includes.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/Profiles.ahk",
    "keywords": [
      "profile",
      "export",
      "options",
      "hotkeys",
      "strategies",
      "selectable"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Export selection",
        "paragraphs": [
          "Profile Manager has independent choices for general settings, keybind groups and strategy contents. It omits sections that weren't selected."
        ],
        "steps": [
          "Open Profile Manager → Export.",
          "Choose a name and description.",
          "Select the groups to include.",
          "Review the export preview.",
          "Save the .ump somewhere outside the release folder."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "What the file may not contain",
        "paragraphs": [
          "If the strategy selection is disabled or a selected strategy file doesn't exist, it won't be included. Check this before treating the export as a complete backup."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "strategy-file-info-section",
    "category": "Strategies",
    "title": "Understand .strat [Info] metadata",
    "summary": "Read author credit, notes, duration and approximate income.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "strat",
      "info",
      "metadata",
      "title",
      "author",
      "desc",
      "income",
      "time"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Documented fields",
        "paragraphs": [
          "Strategy Lab's code reference includes an [Info] section used by published strategy files. Gameplay-income estimates are descriptive, not verified guarantees."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "title",
            "Public strategy name"
          ],
          [
            "author",
            "Creator attribution"
          ],
          [
            "desc",
            "Useful restrictions and setup notes"
          ],
          [
            "income",
            "Claimed farming yield"
          ],
          [
            "time",
            "Approximate run length"
          ]
        ]
      },
      {
        "title": "Improve a shared strategy",
        "paragraphs": [],
        "steps": [
          "Name the map and mode in a useful title or description.",
          "Identify tower requirements and optional modifiers.",
          "Record a tested run and note the conditions.",
          "Avoid claiming exact hourly earnings without consistent measurements."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "strategy-lab-visual-capabilities",
    "category": "Strategies",
    "title": "What Strategy Lab actually supports",
    "summary": "Visual editing for footprints, attack ranges and map backgrounds.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/README.md",
    "keywords": [
      "strategy",
      "lab",
      "map",
      "footprint",
      "attack",
      "range",
      "split",
      "path",
      "calibration"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "In the v1.3.5 source",
        "paragraphs": [
          "The packaged Strategy Lab is described as a separate visual editor with placement footprints, tower attack ranges, map backgrounds, calibration persistence and split-path range tracking."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Open from",
            "Create → Strategy Lab, or StrategyLab.exe"
          ],
          [
            "Input",
            ".strat file"
          ],
          [
            "Visual context",
            "Placement positions, footprints, ranges and map background"
          ]
        ]
      },
      {
        "title": "Safe edit workflow",
        "paragraphs": [],
        "steps": [
          "Back up the original .strat.",
          "Open the copy in Strategy Lab.",
          "Change one spatial action or related sequence.",
          "Save the edited file under a new name.",
          "Reopen the file, then test the strategy in a supervised match."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "strategy-lab-sandbox-camera",
    "category": "Strategies",
    "title": "Capture a Strategy Lab map in Sandbox",
    "summary": "Understand why capture needs an already-open Sandbox session.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/calibration/sandbox_replay.ahk",
    "keywords": [
      "map",
      "capture",
      "sandbox",
      "camera",
      "alignment",
      "screenshot",
      "calibration"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Precondition",
        "paragraphs": [
          "The calibration helper is designed to operate inside an already-open TDS Sandbox match. It verifies the macro's camera and coordinate assumptions before attempting an exact replay."
        ],
        "steps": [
          "Enter the intended map in Sandbox manually.",
          "Open the Strategy Lab capture/calibration feature for that build.",
          "Allow the helper to validate its camera alignment.",
          "Save the resulting map capture if the tool confirms success."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "If calibration refuses",
        "paragraphs": [
          "Do not force a replay on an incompatible map or resolution. Save the refusal message and version details for the developer."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "recording-hotkeys-source",
    "category": "Strategies",
    "title": "Source-backed recording hotkey defaults",
    "summary": "Read the default keys used when recording actions.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "record",
      "hotkey",
      "spawn",
      "upgrade",
      "align",
      "dj",
      "sell",
      "delete",
      "inputs"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Defaults in Main.ahk",
        "paragraphs": [
          "These keys are read from the RecordingHotkeys section and can be changed by the user. They are not always the current bindings on an existing installation."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Place tower",
            "F"
          ],
          [
            "Upgrade tower",
            "Ctrl+U"
          ],
          [
            "Align camera",
            "Ctrl+T"
          ],
          [
            "Delete last recorded action",
            "Ctrl+B"
          ],
          [
            "Record inputs",
            "Ctrl+Shift+E"
          ]
        ]
      },
      {
        "title": "When a shortcut fails",
        "paragraphs": [],
        "steps": [
          "Open the recording keybind settings.",
          "Compare the configured combination with the macro defaults.",
          "Check for conflicts with Roblox or another desktop application.",
          "Re-test a single recorded action in a supervised session."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "launch-stop-source",
    "category": "Start here",
    "title": "Start and stop keys in the installed macro",
    "summary": "Confirm the F1/F2 bindings and what they call.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "f1",
      "f2",
      "start",
      "stop",
      "strategy",
      "stop",
      "cleanup"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Source behavior",
        "paragraphs": [
          "Main.ahk binds F1 to StartStrategy and F2 to StopStrategy. The implementation uses pass-through hotkeys, so the keys can also reach another focused application."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "F1",
            "StartStrategy"
          ],
          [
            "F2",
            "StopStrategy"
          ]
        ]
      },
      {
        "title": "When stopping a stuck run",
        "paragraphs": [],
        "steps": [
          "Press F2 once and allow cleanup to finish.",
          "If Roblox remains active, check whether held inputs have actually been released.",
          "Collect logs if the macro ignores the stop key or remains in a recovery loop."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "settings-defaults-source",
    "category": "Setup & settings",
    "title": "Understand saved option defaults",
    "summary": "See the settings used when a value is absent from the macro's INI file.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk",
    "keywords": [
      "settings",
      "ini",
      "autoequip",
      "restart",
      "replay",
      "defaults"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Read-time defaults",
        "paragraphs": [
          "The v1.3.5 macro reads settings from an INI file and supplies fallbacks. Saved user settings override these defaults."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "AutoEquip",
            "Off (0)"
          ],
          [
            "UseRestartBtn",
            "On (1)"
          ],
          [
            "UsePlayAgainBtn",
            "On (1)"
          ],
          [
            "CheckTheMap",
            "On (1)"
          ],
          [
            "RotateStrategies",
            "Off (0)"
          ]
        ]
      },
      {
        "title": "When defaults don't match",
        "paragraphs": [
          "A previously saved value can differ from a default. Review Settings and the underlying INI before assuming the program ignored the user."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "map-ready-recovery-source",
    "category": "Sessions & tools",
    "title": "Understand lobby and Ready-screen recovery",
    "summary": "What can happen when a session starts or resumes in an unexpected state.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/README.md",
    "keywords": [
      "reconnect",
      "resume",
      "lobby",
      "ready",
      "map",
      "detection",
      "retry"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Supported behavior",
        "paragraphs": [
          "The v1.3.5 release advertises automatic reconnect and game re-entry, with watchdog and action-confirmation improvements. Whether a particular unexpected dialog is recoverable depends on its actual screen state."
        ],
        "steps": [
          "Run one complete match supervised.",
          "Check the transition back to the lobby or Ready screen.",
          "Watch which map and mode are selected on re-entry.",
          "If the macro stalls, stop with F2 and capture the last visible state and logs."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Don't assume universal recovery",
        "paragraphs": [
          "Game UI updates, Roblox login prompts or a mismatched strategy may require a manual intervention even when automatic reconnect works normally."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "source-backed-issue-report",
    "category": "Troubleshooting",
    "title": "Make a reproducible issue report from code evidence",
    "summary": "Collect useful version, screen state and logs for a real bug.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/README.md",
    "keywords": [
      "bug",
      "issue",
      "report",
      "version",
      "screenshot",
      "logs",
      "reproduce"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Useful evidence",
        "paragraphs": [],
        "steps": [
          "Record the installed Ultimate Macro version and which release tag it came from.",
          "Write the exact action expected and action observed.",
          "Note Windows resolution/scaling, Roblox FPS, TDS UI Scale and map/mode.",
          "Capture a cropped screenshot of the unexpected state.",
          "Include a redacted log excerpt, not account tokens or private webhook URLs."
        ],
        "checks": [],
        "rows": []
      },
      {
        "title": "Avoid speculative diagnosis",
        "paragraphs": [
          "A missed click can be caused by map geometry, cash, a changing UI, or input timing. The report should separate observed facts from proposed causes."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "timescale-source-reference",
    "category": "Sessions & tools",
    "title": "How TimeScale is represented in macro settings",
    "summary": "Identify the setting used for accelerated matches.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/lib/Profiles.ahk",
    "keywords": [
      "timescale",
      "1.5x",
      "2x",
      "setting",
      "profile",
      "mode"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Implementation names",
        "paragraphs": [
          "Profile Manager exports TimeScaleMode, and the official README lists 1.5x and 2x TimeScale support."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Profile field",
            "TimeScaleMode"
          ],
          [
            "Game behavior",
            "Requires the relevant ticket/prompt to be available"
          ]
        ]
      },
      {
        "title": "Supervised validation",
        "paragraphs": [],
        "steps": [
          "Check whether tickets are available in TDS.",
          "Select the supported speed in macro settings.",
          "Start a short supervised run.",
          "Confirm gameplay actually changes speed and the strategy still completes.",
          "Return to standard speed if timing or prompts cause failure."
        ],
        "checks": [],
        "rows": []
      }
    ]
  },
  {
    "slug": "updater-missing-safe-script",
    "category": "Troubleshooting",
    "title": "Updater cannot find safe_update.ps1",
    "summary": "Identify an incomplete extracted package before attempting an update.",
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/submacros/updater.ahk",
    "keywords": [
      "safe_update.ps1",
      "missing",
      "updater",
      "error",
      "submacros"
    ],
    "version": "v1.3.5 source inspection",
    "sections": [
      {
        "title": "Source check",
        "paragraphs": [
          "The updater explicitly looks for submacros\\safe_update.ps1. If missing, it displays an Update Error and stops without changing the installation."
        ],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "Expected file",
            "<extracted release>\\submacros\\safe_update.ps1"
          ],
          [
            "Typical cause",
            "Incomplete extraction or moving Main.ahk by itself"
          ]
        ]
      },
      {
        "title": "Fix without bypassing checks",
        "paragraphs": [],
        "steps": [
          "Stop Ultimate Macro.",
          "Download the complete official ZIP.",
          "Extract it as a whole into a clean folder.",
          "Confirm submacros\\safe_update.ps1 exists.",
          "Back up existing .strat files before switching to the clean folder."
        ],
        "checks": [],
        "rows": []
      }
    ]
  }
];
