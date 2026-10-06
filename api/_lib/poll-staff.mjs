import { randomBytes, randomUUID, createHash } from "node:crypto";
import { sql } from "./db.mjs";
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const tokenHash = (value) =>
  createHash("sha256").update(value).digest("hex");
export const validToken = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export const validId = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function staffToken(request) {
  const matches = (request.headers.get("cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("um_poll_staff="));
  if (matches.length !== 1) return null;
  const raw = matches[0].slice("um_poll_staff=".length);
  return validToken(raw) ? raw : null;
}
export function staffCookie(request, token, clear = false) {
  const secure =
    new URL(request.url).protocol === "https:" ||
    process.env.NODE_ENV === "production";
  return `um_poll_staff=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}
export function createStaffStore(pool = sql) {
  return {
    async createInvite(label, hours = 24) {
      if (
        typeof label !== "string" ||
        !label.trim() ||
        label.length > 80 ||
        !Number.isInteger(hours) ||
        hours < 1 ||
        hours > 168
      )
        throw new Error(
          "Use a label of 1–80 characters and a lifetime of 1–168 hours.",
        );
      const token = randomBytes(32).toString("base64url");
      const { rows } = await pool().query(
        `insert into poll_staff_invites(id,token_hash,label,expires_at) values($1,$2,$3,now()+$4*interval '1 hour') returning id,label,expires_at`,
        [randomUUID(), tokenHash(token), label.trim(), hours],
      );
      return { ...rows[0], token };
    },
    async invite(token) {
      if (!validToken(token)) return null;
      const { rows } = await pool().query(
        "select id from poll_staff_invites where token_hash=$1 and consumed_at is null and revoked_at is null and expires_at>now()",
        [tokenHash(token)],
      );
      return rows[0] || null;
    },
    async consume(token) {
      if (!validToken(token)) return null;
      const client = await pool().connect();
      try {
        await client.query("begin");
        const { rows } = await client.query(
          "update poll_staff_invites set consumed_at=now() where token_hash=$1 and consumed_at is null and revoked_at is null and expires_at>now() returning id",
          [tokenHash(token)],
        );
        if (!rows[0]) {
          await client.query("rollback");
          return null;
        }
        const raw = randomBytes(32).toString("base64url");
        await client.query(
          `insert into poll_staff_sessions(id,invite_id,token_hash,expires_at) values($1,$2,$3,now()+$4*interval '1 second')`,
          [randomUUID(), rows[0].id, tokenHash(raw), SESSION_SECONDS],
        );
        await client.query("commit");
        return raw;
      } catch (e) {
        await client.query("rollback");
        throw e;
      } finally {
        client.release();
      }
    },
    async session(token) {
      if (!validToken(token)) return null;
      const { rows } = await pool().query(
        `select s.id,s.expires_at from poll_staff_sessions s join poll_staff_invites i on i.id=s.invite_id where s.token_hash=$1 and s.revoked_at is null and s.expires_at>now() and i.revoked_at is null`,
        [tokenHash(token)],
      );
      return rows[0] || null;
    },
    async logout(token) {
      if (validToken(token))
        await pool().query(
          "update poll_staff_sessions set revoked_at=now() where token_hash=$1",
          [tokenHash(token)],
        );
    },
    async list() {
      const invites = await pool().query(
        "select id,label,created_at,expires_at from poll_staff_invites where consumed_at is null and revoked_at is null and expires_at>now() order by created_at desc limit 200",
      );
      const sessions = await pool().query(
        "select s.id,i.label,s.created_at,s.expires_at from poll_staff_sessions s join poll_staff_invites i on i.id=s.invite_id where s.revoked_at is null and i.revoked_at is null and s.expires_at>now() order by s.created_at desc limit 200",
      );
      return { invites: invites.rows, sessions: sessions.rows };
    },
    async revoke(kind, id) {
      if (!["invite", "session"].includes(kind) || !validId(id))
        throw new Error("Use invite/session and a valid ID from list.");
      const table =
        kind === "invite" ? "poll_staff_invites" : "poll_staff_sessions";
      const { rowCount } = await pool().query(
        `update ${table} set revoked_at=now() where id=$1 and revoked_at is null`,
        [id],
      );
      return rowCount;
    },
  };
}
