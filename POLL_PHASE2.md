# Ultimate Macro poll — Phase 2

The Phase 1 engine, API, database schema, survey definitions, save queue and revision protocol stay intact. This change adds native CSS/Web Animations around the existing frontend. No new runtime dependency, migration, endpoint, staff dashboard or public analytics.

## Visual and interaction changes

- Editorial gradient landing, layered orbital glass artwork, staggered entrance and fine-pointer tilt.
- Directional question transitions, masked word reveals, answer cards flying into the progress area, physical selection/rating feedback, glass button highlights and spring ranking movements.
- Section colors and artwork: reliability signals, interface layout studies, Strategy Lab action blocks, Cloud connections, community bubbles and feature prisms. UI examples are lightweight decorative HTML/CSS studies; survey options and their meanings remain unchanged.
- Branch follow-ups connect to the previous choice with contextual copy. ETA and progress animate independently of navigation.
- Resume cue, saving/offline indicators and a radial completion constellation.
- Three small discoveries: the footer spark reveals a turtleneck developer reference after three clicks; a five-star satisfaction answer gets a one-time wink; choosing no proposed features gets a one-time reminder that fewer features can be a valid priority. None changes answers or navigation.

## Motion and accessibility

`src/poll-motion.js` owns artwork and motion. Effects use finite transform/opacity animations; delayed entrances use backwards fill to prevent flashes. Pointer updates are event-driven and limited to the desktop landing. Tablet has its own split layout; phone questions use compact section emblems and omit desktop backdrop filtering. Ambient orbital movement runs only twice on large screens.

Reduced motion removes CSS animation/transitions, skips Web Animations, and cancels effects if the preference changes during use. Semantic input controls, visible focus, touch ranking buttons and one primary heading remain. Number shortcuts apply only while an answer group has focus; Enter continues from focused answer controls. Navigation remains locked while saves and transitions finish.

## Completion timing

`src/poll-clock.js` measures active visible time using a monotonic clock. Pointer, keyboard and input activity extend a 45-second idle window. Hidden tabs, longer idle gaps and time between visits do not accrue. The local total is persisted periodically and on saves/page exit, then frozen on completion. Completion shows approximate active minutes only when a matching completed local record exists; old responses without that record omit the duration. The backend elapsed field remains unchanged and is no longer displayed.

Timing is an approximate browser-local courtesy, not analytics. It does not transfer across devices; clearing local storage can remove the estimate, and simultaneous tabs do not merge active totals. Server-side response persistence and cookie authorization continue to work independently.

## Files

Added: `src/poll-motion.js`, `src/poll-clock.js`, `tests/poll-clock.test.mjs`, `POLL_PHASE2.md`.

Modified: `poll/index.html`, `styles/poll.css`, `src/poll.js`, `tests/poll-browser.mjs`, `POLL_PHASE1.md` (completion-timing note).

## Verification

- Full Node suite with external PGlite SQL integration: 37/37 pass, no skips, including Strategy Network. Four clock tests cover active time, overnight idle, hidden/completed sessions and resume/reset.
- Chromium flows at 320, 390, 820 and 1440px with normal and reduced motion: adaptive completion, Back/editing, touch ranking, autosave/refresh, immediate-close resume, offline retry, in-flight draft recovery and navigation locking.
- Keyboard tests cover focused numeric choices, Enter, repeated submission attempts, focus and prevention of answer changes outside the answer group. A live reduced-motion change cancels effects.
- Landing, branch, UI, ranking and completion screenshots were inspected at phone, tablet and desktop widths. Reduced-motion tablet overflow was reproduced and fixed; a review also identified and fixed delayed-entrance flashes and global digit shortcuts.

Physical iPhone/iPad, iOS Safari, device GPU/frame-rate measurements, production nginx/service deployment and native PostgreSQL multi-process concurrency were not verified. Chromium emulation is not a Safari test. No deployment was performed.

Phase 1 PR #12 is still open, so the Phase 2 PR is stacked on `feat/poll-phase-1`. Merge/deploy Phase 1 through the existing procedure before deploying this frontend; Phase 2 itself needs no additional database changes. Phase 3 can add a separate authorized staff interface without restructuring the public survey or motion layer.
