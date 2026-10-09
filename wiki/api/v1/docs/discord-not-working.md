# Discord updates aren't arriving

> Separate webhook failures from remote-control failures.

Status: published
Version: v1.3.x
Category: Troubleshooting
Article: https://ultmacro.xyz/wiki/?article=discord-not-working
Source: /guide/discord/

## Webhook test

1. Open the macro's Discord tab.
2. Use Test Webhook with your configured URL.
3. If it fails, confirm the webhook still exists and the right URL was pasted.
4. Check whether Discord message permissions or channel settings have changed.

## Remote commands

Check that the macro runs locally, then try a bot status request. If that fails, verify the connection for your version.

## Keep secrets private

Never paste webhook URLs or bot tokens into public support posts. Rotate a URL or token if it leaks.
