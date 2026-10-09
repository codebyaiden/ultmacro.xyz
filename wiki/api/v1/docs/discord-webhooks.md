# Send logs to Discord

> Set up a webhook for run logs, stats and screenshots.

Status: published
Version: v1.3.x
Category: Community
Article: https://ultmacro.xyz/wiki/?article=discord-webhooks
Source: /guide/discord/

## Create a private webhook

1. In a Discord server, open a channel's settings → Integrations → Webhooks.
2. Create a webhook and copy its URL.
3. Open the macro's Discord tab, paste the URL and enable the webhook.
4. Select the information you want to send, then use Test Webhook.

## Available reports

| Setting | Value |
| --- | --- |
| Send Statistics | Currency and session numbers read with OCR. |
| Debug Logs | Local debug events forwarded to Discord. |
| Automatic screenshots | Periodic images during a run. |
| Triumph / Loss screenshots | Result-screen images, optionally sent to a second webhook. |

## Privacy

Treat a webhook URL as a password. Screenshots may show account names or other on-screen details.
