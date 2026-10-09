# Activating the live Wiki API

The full published content is **already accessible** at https://ultmacro.xyz/wiki/api/v1/articles.json on the static website. The dynamic JSON routes are implemented in \`api/wiki.mjs\` and mounted in \`server.mjs\`, but they require the live Node process and proxy to serve the new code.

## Check in this order

1. Confirm \`/opt/ultmacro/website\` contains the current \`api/wiki.mjs\` and the amended \`server.mjs\`.
2. Check the Node service health and error log before restarting.
3. Restart **only** the existing \`ultmacro-strategy-network.service\` using systemd. Do not restart the production account/database services for a Wiki-only route change.
4. Compare the local port and public hostname results:

\`\`\`bash
sudo systemctl status ultmacro-strategy-network.service --no-pager
sudo systemctl restart ultmacro-strategy-network.service
sudo systemctl status ultmacro-strategy-network.service --no-pager
curl -i http://127.0.0.1:3000/api/wiki/v1
curl -i 'http://127.0.0.1:3000/api/wiki/v1/search?q=ocr'
curl -i https://ultmacro.xyz/api/wiki/v1
curl -i 'https://ultmacro.xyz/api/wiki/v1/search?q=ocr'
\`\`\`

**If local succeeds but public returns 404:** the edge/nginx rules are not forwarding \`/api/wiki/v1\` to the website service. Inspect the existing virtual host routing with \`sudo nginx -T\`, and add a narrowly scoped proxy route using the *same proxy headers and access policy as* \`/api/strategies\`. Test with \`sudo nginx -t\` before reloading. Do not overwrite unrelated locations, especially the production account and poll APIs.

**If local returns 404:** check that the service is running the updated working directory and that it was restarted after the pull; inspect \`journalctl -u ultmacro-strategy-network.service -n 100 --no-pager\`.

**If local errors:** revert the Wiki API deployment and diagnose the logs. The static JSON snapshot remains available throughout.

The dynamic API provides read-only \`GET/HEAD/OPTIONS\`, CORS \`*\`, bounded pagination/search, ETags and published content only. Avoid exposing administrative tools or private roadmap material on these endpoints.
