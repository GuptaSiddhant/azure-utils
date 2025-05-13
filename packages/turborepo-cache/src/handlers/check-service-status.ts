import { parseTeamFromQuery, parseTokenFromHeaders } from "../utils/validators";
import type { CacheRouterHttpHandler } from "../utils/types";

export const checkServiceStatusHandler: CacheRouterHttpHandler =
  (options) => async (request, context) => {
    const authResult = parseTokenFromHeaders(
      request.headers,
      context,
      options.turboToken
    );
    if (authResult !== true) return authResult;

    const team = parseTeamFromQuery(request.query, context);
    if (typeof team !== "string") return team;

    context.info("Status check for cache service", { team });

    const version =
      process.env["PACKAGE_VERSION"] ??
      process.env["npm_package_version"] ??
      "unknown";

    return { status: 200, jsonBody: { status: "enabled", version } };
  };
