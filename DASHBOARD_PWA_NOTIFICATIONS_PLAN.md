# Ultimate Macro Dashboard — PWA & Notifications Plan

## Goal

Let a user install the Dashboard on a phone, choose which macro alerts they receive and on which devices, then tap an alert to see a useful detail page. Keep notification records and undelivered alerts for no more than 12 hours.

This document records the intended behavior and release checks. Implementation is now underway; items that need new macro telemetry remain gated until the app can report them accurately.

## Implementation status

- Local implementation adds server-stored account and per-installation preferences, targeted test pushes, a protected notification detail page, 12-hour detail expiry/push TTL, and PC offline/reconnect alerts.
- Activity push delivery currently covers run start, pause, resume, stop, and confirmed tower place/upgrade/sale events already emitted by the current macro.
- Victory, loss, error, boss, wave, and run-summary alerts remain unavailable until the macro reports those outcomes with verified data.
- Production release and a real phone push still require deployment checks and a physical-device test.

## Current state

- The Dashboard already has a web app manifest, an install prompt, a service worker, and push notification handling.
- The Notifications page can enable, test, and disable push. The server has endpoints to save subscriptions and send a test alert.
- Push subscriptions are stored by account owner. VAPID keys are required by the API; production configuration and delivery to a physical phone still need a real-device check.
- Notification preferences currently live in each browser's local storage. The server does not yet apply those choices to real events.
- Activity events are stored for up to 30 days. The API currently accepts run start/stop/pause/resume, strategy actions, and playtime reward claims. Uploading an event does not currently send a push.
- Victory, loss, and error events are not yet accepted by the Dashboard API. Their notifications must wait until the macro can provide those verified events.
- A push click can open a Dashboard URL. The current test alert opens Notifications; no event detail page exists yet.

## Device and install flow

1. From **Devices**, the user chooses **Add a Device** and scans the QR code or opens the short link on their phone.
2. The one-time link signs that browser/PWA installation into the correct Dashboard account. Pairing links expire after 15 minutes and are single-use.
3. On iPhone, the user adds the site to the Home Screen, opens the installed Dashboard, and enables alerts there. On supported Android browsers, they can install the Dashboard and enable alerts.
4. The user taps **Enable alerts**. The browser asks for notification permission, creates a push subscription, and the Dashboard saves it to the user's account.
5. **Send test** verifies the delivery path before real event alerts are enabled.

The website can identify a browser/PWA push subscription, not a physical phone with certainty. In this plan, “device” means one installed app/browser subscription. Reinstalling the PWA or changing browser may require enabling alerts again. Verify that the phone's one-time sign-in carries into its installed PWA during iPhone testing.

## Notification preferences

Offer both scopes:

- **Same on all devices:** one account-wide set of choices is used by every subscribed phone/PWA.
- **Customize this device:** this installation overrides the account-wide choices. Other devices keep their own setting or follow the account default.

Store account-wide preferences on the server. Store device overrides against the push subscription's stable server-side identifier, not its raw endpoint in client-facing data. When there is no device override, use the account-wide preference.

Allow people to choose alert types and frequency. Start with the existing groups and choices, then extend them only for event types the macro can verify:

- **Run results:** every result, errors only, or off.
- **During a run:** bosses only, all supported activity, or off.
- **PC connection:** every change, offline only, or off.
- **Run summaries:** let the user choose a milestone interval or off (for example, a 10-run recap).

Do not send every tower action by default. Apply the user's selection and avoid bursty duplicate alerts.

## Alert content

Each push should be short: a clear title, one useful line, and the Ultimate Macro app icon. Include optional details only when confirmed by the macro.

| Event | Example title | Example message |
|---|---|---|
| Victory | 🏆 Victory! | Fallen Down cleared · Wave 40 |
| Loss | Run ended | Fallen Down ended at Wave 32. |
| Error | Uh-oh, the run hit a snag | The macro stopped because of an error. Open the alert for details. |
| User stopped run | Run stopped | The macro was stopped from your Dashboard. |
| Boss | Boss incoming | Fallen King appeared · Wave 40 |
| PC offline | Your PC went offline | The Dashboard lost its connection to your PC. |
| PC restored | Your PC is back | The Dashboard connection has been restored. |
| Run milestone | 🏆 10/10 runs won | 3,000 coins earned · 10 rounds played |

Never infer a loss from a stopped run, or an error from an offline PC. Use real counts, names, rounds, and rewards only when their source is verified. Use a stable notification tag to replace/coalesce repeated status alerts where appropriate.

## Tap behavior: custom detail page

Every event push opens one reusable page, for example `/dashboard/notification/?id=<notification-id>`.

The page should show:

- The event title and concise explanation.
- Verified context such as strategy, map, wave, action, or result when available.
- When it happened and which PC reported it.
- A clear link to the related Activity entry when one exists.

The page is informational. Opening an alert must never start, pause, stop, or otherwise control a macro run. If the alert has expired, explain that it is no longer available and link to Activity if the underlying event is still retained.

The push payload should contain only a notification ID, safe title/body, category, and internal destination. Fetch full details from the authenticated Dashboard API. Do not place credentials, private device tokens, or sensitive diagnostic text in the notification URL or push payload.

## Twelve-hour expiry and storage

Apply the user's choice **C: both**:

1. Keep the server-side notification detail record for 12 hours, then delete it.
2. Set push-service delivery TTL to 12 hours so an alert waiting for an offline phone is discarded after that window.
3. Keep push subscriptions until the user turns alerts off or the push service reports that the endpoint is invalid. They are needed for future alerts and are not temporary notification history.
4. Keep Activity under its separate existing retention rule; do not delete Activity events just because their push detail expired.
5. Add a scheduled cleanup on the API service and an expiry index/query so expired notification rows are removed predictably. Also discard expired rows when queried, so cleanup timing never exposes stale details.

The 12-hour rule applies to server details and undelivered push messages. Once a phone has displayed a notification, its system notification tray is controlled by iOS/Android. The website cannot guarantee that an already-delivered alert disappears from the tray exactly 12 hours later. If the user taps it after expiry, the detail page shows an expired state and links to retained Activity when possible.

## Backend event-to-push flow

1. The macro emits a stable, idempotent event ID and sequence only for events it can verify.
2. The API validates the event and stores it in Activity.
3. The API maps eligible event types to notification categories and checks account preferences plus any device override.
4. It creates a minimal notification detail record with `created_at` and `expires_at` (12 hours).
5. It sends pushes only to subscriptions whose effective settings allow that category, with 12-hour delivery TTL.
6. Duplicate retries must not create duplicate alerts. Use event ID plus notification type as the idempotency key. Apply per-category throttling/coalescing for frequent tower and wave events.
7. Remove subscriptions when push providers report them permanently invalid. Treat temporary delivery errors as retryable without blocking macro activity uploads.

Victory, loss, error, and aggregate run summaries require new verified macro events before enabling their push choices. A “10-run” summary must be calculated from actual run outcomes, not assumed from run count alone.

## Security and privacy

- Keep the VAPID private key and push credentials only in the API service's secret environment; never in website source or the PWA.
- Require the authenticated Dashboard owner session for preference and detail reads/writes. Desktop event uploads continue using the paired device token.
- Validate notification IDs and destinations; only allow internal Dashboard routes.
- Store only the fields required to render an alert. Avoid retaining raw logs or full exception traces in push data.
- Respect notification permission: ask only after the user taps Enable, and provide a clear way to unsubscribe each device.
- Keep the private Dashboard access gate and existing pairing controls intact.

## Implementation order

1. **Verify prerequisites:** production VAPID configuration, database migration, subscription save/remove, and test push on the user's phone. Confirm sign-in inside the installed iPhone PWA.
2. **Preferences:** add account-wide and per-device settings storage and effective-setting resolution; preserve current choices during migration from browser local storage.
3. **Notification records and expiry:** add the minimal details table, 12-hour cleanup, 12-hour push TTL, and expired-detail response.
4. **Detail page:** build the single reusable authenticated alert page and safe Activity fallback.
5. **Macro event contracts:** add confirmed victory, loss, and error events, then any summary inputs. Keep the macro running normally if network delivery fails.
6. **Event delivery:** filter by preferences, deduplicate, throttle/coalesce, and send pushes to the selected subscriptions.
7. **Real-device verification:** test account-wide and per-device settings, online and offline phones, alert tap routing, expired details, unsubscribe, iPhone PWA, and Android browser/PWA. Verify no duplicate or incorrect result alerts.

## Completion criteria

- A phone can link to the correct Dashboard account, install/open the PWA, enable alerts, and receive a test push.
- A user can choose shared preferences or per-device overrides; changes persist after reload and are applied by the server.
- Only verified and enabled events produce pushes, with no duplicate bursts.
- Tapping an alert opens its custom detail page; expired details show a clear fallback.
- Server notification details and undelivered pushes expire after 12 hours; subscriptions remain until explicitly disabled or invalid.
- No push/network failure blocks or changes macro execution, and no macro control is triggered by viewing or opening a notification.
