export function requestOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  let protocol = forwardedProto;
  try { protocol ||= new URL(request.url).protocol.replace(/:$/, ""); } catch { return false; }

  if (!origin || !host || (protocol !== "http" && protocol !== "https")) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host.toLowerCase() === host.toLowerCase() && parsed.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}
