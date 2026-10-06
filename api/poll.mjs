import { randomBytes, createHash } from "node:crypto";
import { databaseConfigured } from "./_lib/db.mjs";
import { error, json, methodNotAllowed, clientIp } from "./_lib/http.mjs";
import { rateLimit } from "./_lib/security.mjs";
import { createPollStore } from "./_lib/poll-store.mjs";
import { publicState, invalid } from "./_lib/poll-engine.mjs";
import { pollOriginAllowed } from "./_lib/poll-origin.mjs";
export const MAX_POLL_BYTES = 16 * 1024;
const hash = (value) => createHash("sha256").update(value).digest("hex");
function session(request) {
  const raw =
    (request.headers.get("cookie") || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("um_poll="))
      ?.slice(8) || "";
  return /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null;
}
function shape(body, keys) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !keys.includes(key))
  )
    throw invalid("Invalid poll payload.");
}
async function payload(request) {
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw Object.assign(new Error("Use application/json."), { status: 415 });
  if (Number(request.headers.get("content-length")) > MAX_POLL_BYTES)
    throw Object.assign(new Error("Poll payload is too large."), {
      status: 413,
    });
  const reader = request.body?.getReader();
  let bytes = 0;
  const chunks = [];
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_POLL_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error("Poll payload is too large."), {
          status: 413,
        });
      }
      chunks.push(Buffer.from(value));
    }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw invalid("Request body must be valid JSON.");
  }
}
export function createPollHandler({
  store = createPollStore(),
  configured = () =>
    databaseConfigured() && Boolean(process.env.STRATEGY_HASH_SECRET),
  limit = rateLimit,
  now = Date.now,
} = {}) {
  let countCache = null,
    countRequest = null;
  async function completedCount() {
    if (countCache && countCache.expires > now()) return countCache.value;
    if (!countRequest) {
      countRequest = Promise.resolve()
        .then(() => store.completedCount())
        .then((value) => {
          if (!Number.isSafeInteger(value) || value < 0)
            throw new Error("Invalid completed count");
          countCache = { value, expires: now() + 60000 };
          return value;
        })
        .finally(() => {
          countRequest = null;
        });
    }
    return countRequest;
  }
  return async function poll(request) {
    try {
      const url = new URL(request.url),
        path = url.pathname.slice("/api/poll".length) || "/";
      if (url.search) return error("Query parameters are not supported.", 400);
      const route = path === "/" ? "state" : path.slice(1);
      if (
        ![
          "state",
          "start",
          "answer",
          "navigate",
          "submit",
          "completions",
        ].includes(route)
      )
        return error("Not found.", 404);
      const method = ["state", "completions"].includes(route) ? "GET" : "POST";
      if (request.method !== method) return methodNotAllowed([method]);
      if (!configured())
        return error(
          "The survey is temporarily unavailable. Please try again later.",
          503,
        );
      if (request.method === "POST") {
        if (request.headers.get("x-poll-request") !== "1")
          return error("Invalid request.", 403);
        if (!pollOriginAllowed(request))
          return error("Invalid request origin.", 403);
      }
      const ip = clientIp(request);
      const allowance = await limit(
        `poll:${route === "start" ? "start" : route === "completions" ? "completions" : "requests"}:${ip}`,
        route === "start" ? 10 : 240,
        60 * 10,
      );
      if (!allowance.allowed)
        return json(
          { error: "Too many requests. Please try again later." },
          429,
          { "retry-after": String(allowance.retryAfter || 60) },
        );
      if (route === "completions")
        return json({ completedCount: await completedCount() }, 200, {
          "cache-control": "public, max-age=60",
        });
      let body = {};
      if (request.method === "POST") body = await payload(request);
      if (route === "start") {
        shape(body, []);
        const raw = session(request);
        if (raw) {
          const existing = await store.read(hash(raw));
          if (existing) return json(publicState(existing));
        }
        const token = randomBytes(32).toString("base64url");
        const row = await store.start(hash(token));
        const secure =
          url.protocol === "https:" ||
          process.env.NODE_ENV === "production" ||
          request.headers.get("origin")?.startsWith("https://")
            ? "; Secure"
            : "";
        return json(publicState(row), 201, {
          "set-cookie": `um_poll=${token}; Max-Age=7776000; Path=/api/poll; HttpOnly; SameSite=Lax${secure}`,
        });
      }
      const raw = session(request);
      if (!raw) return error("No saved survey was found on this browser.", 401);
      if (route === "state") {
        const row = await store.read(hash(raw));
        return row
          ? json(publicState(row))
          : error("Survey session not found.", 401);
      }
      const keys = {
        answer: ["revision", "questionId", "value", "advance"],
        navigate: ["revision", "direction"],
        submit: ["revision"],
      };
      shape(body, keys[route]);
      if (!Number.isSafeInteger(body.revision) || body.revision < 0)
        throw invalid("Invalid survey revision.");
      if (
        route === "answer" &&
        (typeof body.questionId !== "string" ||
          !Object.hasOwn(body, "value") ||
          (body.advance !== undefined && typeof body.advance !== "boolean"))
      )
        throw invalid("Invalid answer payload.");
      if (route === "navigate" && !["back", "next"].includes(body.direction))
        throw invalid("Invalid navigation direction.");
      const action = route === "navigate" ? body.direction : route;
      const row = await store.update(hash(raw), body.revision, {
        ...body,
        action,
      });
      return row
        ? json(publicState(row))
        : error("Survey session not found.", 401);
    } catch (caught) {
      if (caught.status) return error(caught.message, caught.status);
      console.error("Poll request failed:", caught.code || "unexpected_error");
      return error("The survey could not be saved. Please try again.", 503);
    }
  };
}
export default createPollHandler();
