import { createStaffStore } from "../api/_lib/poll-staff.mjs";
import { sql } from "../api/_lib/db.mjs";
const [action, ...args] = process.argv.slice(2),
  store = createStaffStore();
try {
  if (action === "create" && args.length >= 1 && args.length <= 2) {
    const origin = new URL(
      process.env.POLL_PUBLIC_ORIGIN || "https://ultmacro.xyz",
    );
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password
    )
      throw Error("Invalid public origin.");
    const invite = await store.createInvite(
      args[0],
      args[1] === undefined ? 24 : Number(args[1]),
    );

    console.log(
      JSON.stringify(
        {
          id: invite.id,
          expiresAt: invite.expires_at,
          url: `${origin.origin}/poll/team/access/${invite.token}`,
        },
        null,
        2,
      ),
    );
  } else if (action === "list" && !args.length)
    console.log(JSON.stringify(await store.list(), null, 2));
  else if (action === "revoke" && args.length === 2)
    console.log(
      JSON.stringify({ revoked: await store.revoke(args[0], args[1]) }),
    );
  else
    throw Error(
      'Usage: node scripts/poll-staff.mjs create "device label" [hours] | list | revoke invite/session UUID',
    );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  if (process.env.DATABASE_URL) await sql().end();
}
