const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function pollOriginAllowed(
  request,
  {
    publicOrigin = process.env.POLL_PUBLIC_ORIGIN || "https://ultmacro.xyz",
    production = process.env.NODE_ENV === "production",
  } = {},
) {
  const configured = new URL(publicOrigin);
  if (
    configured.origin !== publicOrigin ||
    (configured.protocol !== "https:" &&
      !(
        configured.protocol === "http:" &&
        !production &&
        loopback.has(configured.hostname)
      ))
  )
    throw new Error("Invalid POLL_PUBLIC_ORIGIN configuration");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  // Non-browser clients may omit Origin; the handler still requires JSON and
  // X-Poll-Request, and never enables cross-origin access.
  if (origin === null) return true;
  if (origin === publicOrigin) return true;
  const url = new URL(request.url);
  return !production && loopback.has(url.hostname) && origin === url.origin;
}
