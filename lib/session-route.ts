import { SESSION_ROUTE_PATTERN } from "@/app/[sport]/session/[id]/route-def";

interface SessionRouteOptions {
  fromTab?: string;
}

export function getSessionPath(
  sport: string,
  sessionId: string,
  options: SessionRouteOptions = {},
): string {
  const path = SESSION_ROUTE_PATTERN.replace("{sport}", sport).replace("{sessionId}", sessionId);

  if (!options.fromTab) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}fromTab=${encodeURIComponent(options.fromTab)}`;
}

export function getSessionUrl(
  siteOrigin: string,
  sport: string,
  sessionId: string,
  options: SessionRouteOptions = {},
): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  return `${origin}${getSessionPath(sport, sessionId, options)}`;
}
