export const stratReferenceArticles = [
  {
    "slug": "strat-file-layout",
    "category": "Strategies",
    "title": "Anatomy of a .strat file",
    "summary": "A .strat file is plain text split into sections. [Settings] holds the run configuration, [DO NOT EDIT] stores the resolution the strategy was recorded at, and [Steps] holds one command per line, executed top to bottom. [Info] is optional and only describes the strategy in the macro list.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: [Info] / [Settings] / [DO NOT EDIT] / [Steps]",
          "A .strat file is plain text split into sections. [Settings] holds the run configuration, [DO NOT EDIT] stores the resolution the strategy was recorded at, and [Steps] holds one command per line, executed top to bottom. [Info] is optional and only describes the strategy in the macro list."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "[Info]",
            "Optional. Shown on the strategy card in the macro. See the Info keys entry below."
          ],
          [
            "[Settings]",
            "key = value lines. See the Settings keys entry below."
          ],
          [
            "[DO NOT EDIT]",
            "width and height of the Roblox client when the strategy was recorded. Every coordinate in [Steps] is scaled from these numbers, so changing them moves every placement."
          ],
          [
            "[Steps]",
            "The command list. Blank lines are ignored, and anything after a ; on a line is treated as a comment."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "[Settings]\nmap=Crossroads\ndifficulty=Molten\nrequiredTowers=Minigunner, Commander\n\n[DO NOT EDIT]\nwidth=1920\nheight=1080\n\n[Steps]\nSleep(2000)\nSpawnTower(960, 540, 1, Mini1)"
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "file layout",
      "info",
      "settings",
      "not",
      "edit",
      "steps"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-settings-keys",
    "category": "Strategies",
    "title": "All .strat [Settings] keys",
    "summary": "The configuration the macro reads before a run starts. Unknown keys are ignored, and any key left out falls back to the default shown here.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: [Settings] key = value",
          "The configuration the macro reads before a run starts. Unknown keys are ignored, and any key left out falls back to the default shown here."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "map",
            "Map name exactly as TDS spells it, for example Crossroads."
          ],
          [
            "difficulty",
            "Casual, Easy, Intermediate, Molten, Fallen, Hardcore, Voidcore, or an Arcade / Trial name."
          ],
          [
            "requiredTowers",
            "Comma separated loadout in hotbar order. Prefix a tower with G for the golden version and R for the regular one, for example G Minigunner. Slot n in SpawnTower is the n-th tower here."
          ],
          [
            "modifiers",
            "Comma separated match modifiers to apply in the map menu. Leave empty for none."
          ],
          [
            "autoChain",
            "ON or OFF. Spams Call of Arms during the run."
          ],
          [
            "autoCaravan",
            "ON or OFF. Spams Support Caravan."
          ],
          [
            "autoDropTheBeat",
            "ON or OFF. Spams Drop the Beat."
          ],
          [
            "autoSkip",
            "ON or OFF, default ON. Presses the wave skip button when it appears."
          ],
          [
            "abilitySpam",
            "ON or OFF, default ON. Allows abilities to be used between steps."
          ],
          [
            "moveEnabled",
            "true or false. Walk after aligning the camera so the view is not blocked."
          ],
          [
            "moveDirection",
            "W, A, S or D. Which way to walk when moveEnabled is true."
          ],
          [
            "moveDuration",
            "How long to hold that key, in milliseconds. Default 750."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "requiredTowers=G Minigunner, Commander, DJ\nmodifiers=Fog\nautoChain=ON\nmoveEnabled=true\nmoveDirection=S\nmoveDuration=750"
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "settings keys",
      "settings",
      "key",
      "value"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-info-keys",
    "category": "Strategies",
    "title": "All .strat [Info] keys",
    "summary": "Optional description shown on the strategy card inside the macro. Nothing here changes how the run is played, so it is safe to edit freely.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: [Info] key = value",
          "Optional description shown on the strategy card inside the macro. Nothing here changes how the run is played, so it is safe to edit freely."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "title",
            "Name shown on the card. Defaults to the file name."
          ],
          [
            "author",
            "Who made the strategy. Defaults to You for local recordings."
          ],
          [
            "desc",
            "One or two lines describing the strategy or what it needs."
          ],
          [
            "time",
            "Roughly how long a run takes, for example 6-7 minutes."
          ],
          [
            "income",
            "What a run pays out, for example up to 5,000 coins per hour."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "[Info]\ntitle=Coin + Any Tower EXP Farm\nauthor=gall\ndesc=Modifiers recommended, timescale optional.\nincome=up to 5,000 coins per hour\ntime=6-7 minutes"
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "info keys",
      "info",
      "key",
      "value"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-spawntower",
    "category": "Strategies",
    "title": "SpawnTower command",
    "summary": "Places a tower from the hotbar on the map and gives it an id. Every later command that touches this tower refers to it by that id.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: SpawnTower(x, y, slot, towerID)",
          "Places a tower from the hotbar on the map and gives it an id. Every later command that touches this tower refers to it by that id.",
          "This is the line the visual editor rewrites when a marker is dragged, so its x and y stay in sync with the map view."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "x",
            "Horizontal position in pixels, measured from the left edge of the Roblox client at the resolution in [DO NOT EDIT]."
          ],
          [
            "y",
            "Vertical position in pixels, measured from the top edge."
          ],
          [
            "slot",
            "Hotbar slot, 1 to 5. Slot n is the n-th tower in requiredTowers."
          ],
          [
            "towerID",
            "A name of your choice, such as Mini1 or dj. It has to be unique in the file. UpgradeTower, SellTower, ChangeTargets, CloneTower and BrawlerReposition all take this id."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "SpawnTower(1063, 528, 1, Mini1)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "spawntower",
      "spawntower",
      "slot",
      "towerid"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-upgradetower",
    "category": "Strategies",
    "title": "UpgradeTower command",
    "summary": "Buys upgrades for a tower that is already placed. The macro opens the tower panel, waits until the upgrade is affordable and confirms each one.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: UpgradeTower(towerID [, skipOpen] [, amount] [, path] [, pathLevel])",
          "Buys upgrades for a tower that is already placed. The macro opens the tower panel, waits until the upgrade is affordable and confirms each one."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "towerID",
            "The id used in SpawnTower."
          ],
          [
            "skipOpen",
            "true or false, default false. Pass true when the tower panel is already open so the macro does not click the tower again."
          ],
          [
            "amount",
            "How many upgrades to buy in a row. Default 1."
          ],
          [
            "path",
            "Which upgrade path to take on a branching tower. Default 0, the top path. Only needed for towers that branch."
          ],
          [
            "pathLevel",
            "The level at which the tower branches. Default 0. Used together with path so the macro knows when the choice appears."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "UpgradeTower(Mini1)\nUpgradeTower(Mini1, false, 4)\nUpgradeTower(Ace1, false, 1, 2, 3)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "upgradetower",
      "upgradetower",
      "towerid",
      "skipopen",
      "amount",
      "path",
      "pathlevel"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-selltower",
    "category": "Strategies",
    "title": "SellTower command",
    "summary": "Sells a placed tower and frees its spot. The id stops being usable by later commands.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: SellTower(towerID)",
          "Sells a placed tower and frees its spot. The id stops being usable by later commands."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "towerID",
            "The id used in SpawnTower."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "SellTower(Scout1)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "selltower",
      "selltower",
      "towerid"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-clonetower",
    "category": "Strategies",
    "title": "CloneTower command",
    "summary": "Uses the Hologram ability to place a copy of an existing tower at a new spot.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: CloneTower(towerID, x, y [, wait])",
          "Uses the Hologram ability to place a copy of an existing tower at a new spot."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "towerID",
            "The tower to copy, by the id used in SpawnTower."
          ],
          [
            "x",
            "Horizontal position of the clone, in the same pixel space as SpawnTower."
          ],
          [
            "y",
            "Vertical position of the clone."
          ],
          [
            "wait",
            "Optional milliseconds to wait before cloning. Default 0, and it is skipped while recording."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "CloneTower(Mini1, 1180, 553)\nCloneTower(Mini1, 1180, 553, 4000)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "clonetower",
      "clonetower",
      "towerid",
      "wait"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-brawlerreposition",
    "category": "Strategies",
    "title": "BrawlerReposition command",
    "summary": "Moves a placed Brawler to a new spot using its reposition ability.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: BrawlerReposition(towerID, x, y)",
          "Moves a placed Brawler to a new spot using its reposition ability."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "towerID",
            "The Brawler, by the id used in SpawnTower."
          ],
          [
            "x",
            "New horizontal position, in the same pixel space as SpawnTower."
          ],
          [
            "y",
            "New vertical position."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "BrawlerReposition(Brawler1, 992, 604)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "brawlerreposition",
      "brawlerreposition",
      "towerid"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-enforcerreposition",
    "category": "Strategies",
    "title": "EnforcerReposition command",
    "summary": "Uses the Helicopter Reposition ability of a top path Enforcer to carry another placed tower to a new spot.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: EnforcerReposition(enforcerID, towerID, x, y)",
          "Uses the Helicopter Reposition ability of a top path Enforcer to carry another placed tower to a new spot."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "enforcerID",
            "The Enforcer running the ability, by the id used in SpawnTower. It has to be top path level 5 or higher."
          ],
          [
            "towerID",
            "The tower being carried, by the id used in SpawnTower."
          ],
          [
            "x",
            "New horizontal position of the carried tower, in the same pixel space as SpawnTower."
          ],
          [
            "y",
            "New vertical position of the carried tower."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "EnforcerReposition(Enf1, Mini1, 1024, 512)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "enforcerreposition",
      "enforcerreposition",
      "enforcerid",
      "towerid"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-activateenforcervan",
    "category": "Strategies",
    "title": "ActivateEnforcerVan command",
    "summary": "Presses the SWAT Van keybind of a bottom path Enforcer. The strategy needs a bottom path Enforcer at level 5 or higher, otherwise the step is skipped.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: ActivateEnforcerVan([wait])",
          "Presses the SWAT Van keybind of a bottom path Enforcer. The strategy needs a bottom path Enforcer at level 5 or higher, otherwise the step is skipped."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "wait",
            "Optional milliseconds to wait before pressing it. Default 0, and it is skipped while recording."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "ActivateEnforcerVan()\nActivateEnforcerVan(3000)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "activateenforcervan",
      "activateenforcervan",
      "wait"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-activateraisethedead",
    "category": "Strategies",
    "title": "ActivateRaiseTheDead command",
    "summary": "Presses the Raise the Dead keybind, which revives the Necromancer skeletons.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: ActivateRaiseTheDead([wait])",
          "Presses the Raise the Dead keybind, which revives the Necromancer skeletons."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "wait",
            "Optional milliseconds to wait before pressing it. Default 0, and it is skipped while recording."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "ActivateRaiseTheDead()\nActivateRaiseTheDead(2500)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "activateraisethedead",
      "activateraisethedead",
      "wait"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-changetargets",
    "category": "Strategies",
    "title": "ChangeTargets command",
    "summary": "Opens the tower panel and cycles its targeting until it matches the target asked for.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: ChangeTargets(towerID, target)",
          "Opens the tower panel and cycles its targeting until it matches the target asked for."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "towerID",
            "The tower, by the id used in SpawnTower."
          ],
          [
            "target",
            "One of First Enemy, Last Enemy, Strongest, Weakest, Closest, Farthest or Random. Written without quotes."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "ChangeTargets(Mini1, Strongest)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "changetargets",
      "changetargets",
      "towerid",
      "target"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-setdjtrack",
    "category": "Strategies",
    "title": "SetDJTrack command",
    "summary": "Selects a track on the DJ Booth. The strategy has to place a tower with the id DJ first.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: SetDJTrack(\"track\")",
          "Selects a track on the DJ Booth. The strategy has to place a tower with the id DJ first."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "track",
            "green, purple or red, in quotes. The macro matches the track by its colour icon, so any other value is refused at runtime."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "SetDJTrack(\"green\")"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "setdjtrack",
      "setdjtrack",
      "track"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-toggleautoskip",
    "category": "Strategies",
    "title": "ToggleAutoskip command",
    "summary": "Presses the in-game autoskip toggle once. Use it to turn wave skipping off for a hard wave and on again afterwards.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: ToggleAutoskip()",
          "Presses the in-game autoskip toggle once. Use it to turn wave skipping off for a hard wave and on again afterwards."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [
          "This command has no parameters."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "ToggleAutoskip()"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "toggleautoskip",
      "toggleautoskip"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-click",
    "category": "Strategies",
    "title": "Click command",
    "summary": "Clicks a point on screen. Useful for buttons the other commands do not cover.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: Click(x, y [, Right])",
          "Clicks a point on screen. Useful for buttons the other commands do not cover."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "x",
            "Horizontal position, in the same pixel space as SpawnTower."
          ],
          [
            "y",
            "Vertical position."
          ],
          [
            "Right",
            "Optional. Add Right for a right click, anything else is a left click."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "Click(960, 540)\nClick(960, 540, Right)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "click",
      "click",
      "right"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-send",
    "category": "Strategies",
    "title": "Send command",
    "summary": "Holds a keyboard key down for a set time, then releases it. This is what the input recorder writes for movement and ability keys.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: Send(\"key\", hold:=ms)",
          "Holds a keyboard key down for a set time, then releases it. This is what the input recorder writes for movement and ability keys."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "key",
            "The key name in quotes, for example \"w\" or \"space\"."
          ],
          [
            "hold",
            "How long to hold it, in milliseconds. The hold:= part is required."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "Send(\"w\", hold:=450)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "send",
      "send",
      "key",
      "hold"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-sleep",
    "category": "Strategies",
    "title": "Sleep command",
    "summary": "Waits before running the next step. This is how a strategy lines up with the waves.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: Sleep(ms)",
          "Waits before running the next step. This is how a strategy lines up with the waves."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [],
        "steps": [],
        "checks": [],
        "rows": [
          [
            "ms",
            "Milliseconds to wait. 1000 is one second."
          ]
        ]
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "Sleep(12000)"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "sleep",
      "sleep"
    ],
    "version": "v1.3.5 source reference"
  },
  {
    "slug": "strat-commander",
    "category": "Strategies",
    "title": "Commander command",
    "summary": "Tells the macro a Commander is in the loadout so it handles the Call of Arms ability during the run. The recorder adds this line by itself when it sees a Commander.",
    "sections": [
      {
        "title": "What it does",
        "paragraphs": [
          "Syntax: Commander := true",
          "Tells the macro a Commander is in the loadout so it handles the Call of Arms ability during the run. The recorder adds this line by itself when it sees a Commander."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Parameters",
        "paragraphs": [
          "This command has no parameters."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      },
      {
        "title": "Example",
        "paragraphs": [
          "This example comes from Strategy Lab's built-in command reference for v1.3.5. Adapt tower IDs and coordinates to the strategy you are editing."
        ],
        "steps": [],
        "checks": [],
        "rows": [],
        "code": "Commander := true"
      },
      {
        "title": "Before replay",
        "paragraphs": [
          "Keep the original .strat as a backup. Save edits under a new filename, then replay one match under supervision; a syntactically valid command does not prove that the tower, ability or coordinates work in the current TDS map."
        ],
        "steps": [],
        "checks": [],
        "rows": []
      }
    ],
    "source": "https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/_app/ui/app.js",
    "keywords": [
      "commander",
      "commander",
      "true"
    ],
    "version": "v1.3.5 source reference"
  }
];
