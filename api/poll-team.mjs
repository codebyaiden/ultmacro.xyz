import { readFile } from "node:fs/promises";
import { databaseConfigured } from "./_lib/db.mjs";
import { json, error, clientIp } from "./_lib/http.mjs";
import { rateLimit } from "./_lib/security.mjs";
import {
  createStaffStore,
  staffToken,
  staffCookie,
  validToken,
} from "./_lib/poll-staff.mjs";
import {
  createAnalytics,
  metadata,
  parseFilters,
} from "./_lib/poll-analytics.mjs";
const headers = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "x-content-type-options": "nosniff",
  vary: "Cookie",
};
function page(title, copy, action = false) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Ultimate Macro</title><link rel="stylesheet" href="/styles/poll-team.css"><body><main class="access-card"><p class="eyebrow">ULTIMATE MACRO / TEAM</p><h1>${title}</h1><p>${copy}</p>${action ? '<form method="post"><button class="primary" type="submit">Open staff dashboard →</button></form>' : '<a href="/poll">Back to the survey ↗</a>'}</main></body></html>`;
}
function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      ...headers,
      "content-type": "text/html; charset=utf-8",
      ...extra,
    },
  });
}
function protectedResponse(response) {
  for (const [key, value] of Object.entries(headers))
    response.headers.set(key, value);
  return response;
}
export function createTeamHandler({
  auth = createStaffStore(),
  analytics = createAnalytics(),
  configured = () =>
    databaseConfigured() && Boolean(process.env.STRATEGY_HASH_SECRET),
  limit = rateLimit,
  readPage = () =>
    readFile(new URL("../poll/team/index.html", import.meta.url), "utf8"),
} = {}) {
  return async (request) => {
    try {
      const url = new URL(request.url),
        path = url.pathname;
      if (!configured())
        return protectedResponse(
          error("Staff feedback is temporarily unavailable.", 503),
        );
      const invitePath = path.startsWith("/poll/team/access/");
      const allowance = await limit(
        `poll-team:${invitePath ? "access" : "read"}:${clientIp(request)}`,
        invitePath ? 20 : 180,
        600,
      );
      if (!allowance.allowed)
        return protectedResponse(
          json({ error: "Too many requests. Try again later." }, 429, {
            "retry-after": String(allowance.retryAfter || 60),
          }),
        );
      if (invitePath) {
        const token = path.slice("/poll/team/access/".length);
        if (
          url.search ||
          !validToken(token) ||
          !["GET", "POST"].includes(request.method)
        )
          return html(
            page(
              "This link is unavailable.",
              "Ask the team operator for a fresh invite.",
            ),
            400,
          );
        if (request.method === "GET")
          return (await auth.invite(token))
            ? html(
                page(
                  "Your next move starts here.",
                  "This one-time link authorizes this browser for 30 days. Keep the link private.",
                  true,
                ),
                200,
                { "referrer-policy": "strict-origin" },
              )
            : html(
                page(
                  "This link is unavailable.",
                  "It may have expired, been revoked, or already been used. Ask for a fresh invite.",
                ),
                410,
              );
        if (
          request.headers.get("origin") !== url.origin ||
          request.headers.get("sec-fetch-site") === "cross-site"
        )
          return protectedResponse(error("Invalid request origin.", 403));
        if (
          (request.headers.get("content-length") &&
            Number(request.headers.get("content-length")) > 1024) ||
          (await request.arrayBuffer()).byteLength > 1024
        )
          return protectedResponse(error("Request too large.", 413));
        const raw = await auth.consume(token);
        if (!raw)
          return html(
            page(
              "This link is unavailable.",
              "Ask the team operator for a fresh invite.",
            ),
            410,
          );
        return new Response(null, {
          status: 303,
          headers: {
            ...headers,
            location: "/poll/team",
            "set-cookie": staffCookie(request, raw),
          },
        });
      }
      const raw = staffToken(request),
        session = raw ? await auth.session(raw) : null;
      if (!session)
        return path.startsWith("/poll/team")
          ? html(
              page(
                "A private space for the team.",
                "Open an individual staff invite on this browser to access feedback.",
              ),
              401,
            )
          : protectedResponse(error("Staff authorization required.", 401));
      if (
        ["/poll/team", "/poll/team/", "/poll/team/index.html"].includes(path)
      ) {
        if (!["GET", "HEAD"].includes(request.method))
          return protectedResponse(error("Method not allowed.", 405));
        if (url.search)
          return protectedResponse(error("Invalid page URL.", 400));
        return html(await readPage());
      }
      if (!path.startsWith("/api/poll-team"))
        return protectedResponse(error("Not found.", 404));
      const route = path.slice("/api/poll-team".length) || "/";
      if (route === "/logout") {
        if (request.method !== "POST")
          return protectedResponse(error("Method not allowed.", 405));
        if (
          url.search ||
          request.headers.get("x-poll-team-request") !== "1" ||
          (request.headers.get("origin") &&
            request.headers.get("origin") !== url.origin) ||
          request.headers.get("sec-fetch-site") === "cross-site"
        )
          return protectedResponse(error("Invalid request origin.", 403));
        if ((await request.arrayBuffer()).byteLength > 1024)
          return protectedResponse(error("Request too large.", 413));
        await auth.logout(raw);
        return protectedResponse(
          json({ signedOut: true }, 200, {
            "set-cookie": staffCookie(request, "", true),
          }),
        );
      }
      if (request.method !== "GET")
        return protectedResponse(error("Method not allowed.", 405));
      let result;
      const extras =
        route === "/question"
          ? ["question"]
          : route === "/responses"
            ? ["page"]
            : route === "/response"
              ? ["id"]
              : route === "/feedback"
                ? ["page", "question", "search"]
                : [];
      const f = parseFilters(url.searchParams, extras);
      if (route === "/") result = await analytics.overview(f);
      else if (route === "/questions") result = metadata(f.version);
      else if (route === "/question" && f.question)
        result = await analytics.question(f, f.question);
      else if (route === "/responses") result = await analytics.responses(f);
      else if (route === "/response" && f.id) {
        result = await analytics.response(f, f.id);
        if (!result)
          return protectedResponse(
            error("Response not found in this segment.", 404),
          );
      } else if (route === "/feedback") result = await analytics.feedback(f);
      else return protectedResponse(error("Not found.", 404));
      return protectedResponse(json(result));
    } catch (caught) {
      return protectedResponse(
        error(
          caught.status
            ? caught.message
            : "Staff feedback is temporarily unavailable.",
          caught.status || 503,
        ),
      );
    }
  };
}
export default createTeamHandler();
