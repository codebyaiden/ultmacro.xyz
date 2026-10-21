# Adcash self-hosted library preparation — 2026-10-21

Status: prepared locally, not published or activated. Existing standard Adcash
configuration remains unchanged until the VPS file and public endpoint are verified.

## Verified hosting

Cloudflare dashboard lists Pages project `ultmacro-xyz`, connected to
`UltimateMacro/ultmacro.xyz`, with the current AutoTag retry deployment. The VPS
has a separate older website tree. Nginx routes public assets on
`api-origin.ultmacro.xyz` to `/opt/ultmacro/website`; HTTPS to the intended library
path succeeds but returns 404 before installation. The owner verified that
`yoshi` can write `/opt/ultmacro/website/assets`, with curl and crontab installed.

## Narrow Pages function

`functions/assets/adcash-library.js` maps to `/assets/adcash-library` (Pages
removes the final .js). `_routes.json` includes only this exact route; other site
requests do not invoke the function. It fetches only the fixed public HTTPS
origin file `/assets/adcash-library.js`, never accepts a target URL, forwards no
visitor headers or cookies, disallows redirects and non-GET/HEAD methods, times
out after 10 seconds, bounds the actual body to 2 MiB, and rejects empty/non-JS
or HTML-looking responses. Valid bytes are unchanged. These checks are not a
malware audit of mutable vendor JavaScript. No fallback ad network is loaded.

## VPS installation (owner's authenticated SSH session)

Official guide:
https://support.adcash.com/en/articles/359-anti-adblock-integration-using-linux-pop-under-and-autotag

Installer source reviewed:
https://github.com/adcash/customer-scripts/blob/master/linux/anti-adblock.sh

Download to a fresh private directory; do not run with sudo or as root:

```bash
um_adcash_setup=$(mktemp -d "$HOME/adcash-setup.XXXXXX") && chmod 700 "$um_adcash_setup"
curl -fSL --proto '=https' -o "$um_adcash_setup/anti-adblock.sh" https://raw.githubusercontent.com/adcash/customer-scripts/master/linux/anti-adblock.sh
bash "$um_adcash_setup/anti-adblock.sh" --install /opt/ultmacro/website/assets/adcash-library.js 5
```

Before install, verify the target does not contain an existing file to preserve.
The installer writes that file and updates only matching jobs in the executing
user's crontab. It uses a vendor download at `https://adbpage.com/adblock?v=3&format=js&lnxv=2`.
It does not cryptographically validate JS or atomically replace the file. Its
initial download can truncate an existing target on failure; use a new target.
Cron overwrites may expose partial bytes briefly. Do not claim these risks are
eliminated by the Pages wrapper. No installer/source modifications or filename
rotation are proposed. Future vendor updates may change behavior.

Verify origin status, JavaScript content type and non-empty body without
executing ads; list only the matching job, not unrelated private cron content.
After publishing the function, verify the public endpoint returns identical
bytes to the origin. Run a Cloudflare runtime build/preview before activation.

## Activation and rollback

Only after successful origin/public checks: set `selfHostedEnabled: true` and
`scriptUrl: "/assets/adcash-library"` in `data/advertising.json` together.
The existing loader still enforces approval flags, one instance, the approved
zone, excluded sensitive pages and frame checks. Do not change the zone.
Keep the shared loader cache version consistent across HTML entry documents
when activating. Verify first-click navigation manually; provider runtime
behavior is not proven by unit tests. Disable `enabled` if navigation breaks.

To return to standard integration set `selfHostedEnabled: false` and restore
`scriptUrl: "https://acscdn.com/script/aclib.js"`. To stop ads set `enabled: false`.
Reload open tabs; already-executed vendor code is not unloaded by a flag change.
Uninstallation must use the saved reviewed installer with `--uninstall` and the
exact target path; that deletes the library and its matching user cron job.
Do not uninstall until the website no longer references the endpoint.

No DNS changes, API routing changes, account credentials, payment changes or
traffic-generation behavior are part of this work. The feature switch is not
a consent manager or proof of Adcash compliance/approval.
