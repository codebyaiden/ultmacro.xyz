# Dashboard UI guide

Use this guide when changing the Ultimate Macro dashboard. Keep the dashboard useful first; polish should make real actions and information easier to find.

## Before editing

- Read the page you are changing and reuse its existing shell, navigation, controls, and styles.
- Keep work inside the dashboard unless the request clearly names another part of the website.
- Use the existing desktop companion/API data. Never invent live status, device readings, strategy counts, or activity to make an empty page look busy.
- Keep labels and feature names consistent with the app: Overview, Manage, Activity, Remote, Earnings, Strategies, Health, Devices, Notifications, and Settings.

## Visual rules

- Keep the dark, restrained dashboard look and its violet accent. Page backgrounds and sidebar colors are user preferences; respect them.
- Use a clear page title, a short useful explanation when needed, and content aligned to one readable width. Center the page content; do not leave a narrow column stranded beside a large empty area.
- Use spacing to group related actions. Prefer one well-composed section over stacks of cards inside cards.
- Give empty, loading, offline, and error states a clear next step. Do not fill empty space with fake metrics, generic slogans, or decorative widgets.
- Keep controls specific: say what will happen and when. Preserve confirmation for actions that change the macro, files, or device.
- Use real product terms. Avoid renaming familiar pages, vague marketing copy, all-caps eyebrow labels, excessive emoji, repeated icon tiles, and generic “AI dashboard” filler.
- Avoid blur/glass effects on important content, oversized glow, unnecessary gradients, heavy shadows, and animations that compete with the data.
- Prefer small, quick transitions. Respect `prefers-reduced-motion`; keep keyboard focus visible and dialogs labelled and dismissible.
- Check narrow screens: no horizontal overflow, clipped controls, or dialogs extending past the viewport.

## Structure and behavior

- Dashboard routes live under `dashboard/`; shared preferences, navigation, tutorial, and page behavior live in `src/dashboard-*.js` and shared dashboard styles live in `styles/dashboard-*.css` / `styles/dashboard-room.css`.
- Extend the existing shared preference and navigation behavior instead of creating a second settings store or duplicate sidebar item.
- Keep page sections in their current sidebar groups. A pinned page appears once in the Pinned section and is removed from its original group until unpinned.
- Keep user settings local to the browser unless the existing API explicitly syncs them. Never put secrets or private credentials in browser code.
- Only show device health values the companion actually reports. Mark unsupported readings unavailable rather than estimating them.
- Keep Activity descriptions tied to recorded events and their real details; do not infer tower actions that were not sent by the macro.
- Do not load ads or ad scripts in dashboard pages. Dashboard content and controls must remain available without an ad overlay.
- When changing a cache-busted dashboard asset, update its `?v=` reference in the relevant page HTML.

## Copy standard

Write like a helpful person who knows the product. Be short, concrete, and friendly. A little casual humor is fine when it clarifies the feature; do not force memes into warnings, confirmations, or health/safety controls. Explain uncertainty plainly and never promise a feature the companion does not support.

## Before shipping

- Check the changed route at desktop and phone widths.
- Confirm the page uses the current labels and has no duplicate navigation entries.
- Verify links, buttons, dialog close/escape behavior, focus, reduced-motion behavior, and real loading/offline/error states.
- For remote controls, health, activity, or strategy installs, verify against the corresponding API/companion contract. A static page preview is not proof of live device behavior.
