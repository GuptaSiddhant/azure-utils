import type { HttpHandler } from "@azure/functions";
import { parseTeamFromQuery, parseTokenFromHeaders } from "src/validators";

export const checkServiceStatusHandler: HttpHandler = async (
  request,
  context
) => {
  const authResult = parseTokenFromHeaders(request.headers, context);
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
