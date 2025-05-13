import {
  parseHashesFromBody,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "../utils/validators";
import type { CacheRouterHttpHandler } from "../utils/types";

export const queryArtifactsInfoHandler: CacheRouterHttpHandler =
  (options) => async (request, context) => {
    const authResult = parseTokenFromHeaders(
      request.headers,
      context,
      options.turboToken
    );
    if (authResult !== true) return authResult;

    const team = parseTeamFromQuery(request.query, context);
    if (typeof team !== "string") return team;

    const hashes = parseHashesFromBody(await request.json(), context);
    if (!Array.isArray(hashes)) return hashes;

    context.info("Status check for artifacts", { team, hashes });

    const result = hashes.map((hash) => ({
      size: 0,
      taskDurationMs: 0,
      tag: `${team}/${hash}`,
    }));

    return { status: 200, jsonBody: result };
  };
