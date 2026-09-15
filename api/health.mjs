import { backendConfigured, blobConfigured, databaseConfigured } from './_lib/db.mjs';
import { json } from './_lib/http.mjs';

export default async function handler() {
  const configured = backendConfigured();
  return json({
    ok: configured,
    service: 'strategy-network',
    configured,
    database: databaseConfigured(),
    blob: blobConfigured(),
    admin: Boolean(process.env.STRATEGY_ADMIN_PASSWORD_HASH),
    now: new Date().toISOString()
  }, configured ? 200 : 503);
}