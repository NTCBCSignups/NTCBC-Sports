/**
 * Route pattern for this page.
 *
 * Colocated here so it stays in sync with the filesystem route. If this
 * directory is ever moved/renamed, the import in lib/session-route.ts will
 * break at compile time — signaling that this pattern string needs updating.
 *
 * Tokens: {sport}, {sessionId}
 */
export const SESSION_ROUTE_PATTERN = "/{sport}/session/{sessionId}";
