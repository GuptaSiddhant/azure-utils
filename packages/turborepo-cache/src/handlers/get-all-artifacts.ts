import type { HttpHandler } from "@azure/functions";
import {
  parseHashesFromBody,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "src/validators";

export const getAllArtifactsHandler: HttpHandler = async (request, context) => {
  const authResult = parseTokenFromHeaders(request.headers, context);
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
