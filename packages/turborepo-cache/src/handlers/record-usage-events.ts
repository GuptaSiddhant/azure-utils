import type { CacheRouterHttpHandler } from "../utils/types";
import {
  parseEventsFromBody,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "../utils/validators";

export const recordUsageEventsHandler: CacheRouterHttpHandler =
  (options) => async (request, context) => {
    const authResult = parseTokenFromHeaders(
      request.headers,
      context,
      options.turboToken
    );
    if (authResult !== true) return authResult;

    const team = parseTeamFromQuery(request.query, context);
    if (typeof team !== "string") return team;

    const events = parseEventsFromBody(await request.json());

    context.info("Recording events", { team });
    events.forEach((event) => {
      context.log("event:", event);
    });

    return { status: 200 };
  };
