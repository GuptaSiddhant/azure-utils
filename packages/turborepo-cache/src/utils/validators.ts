import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import type { Headers } from "undici";
import { responseError } from "./error-utils";

export function parseTeamFromQuery(
  query: URLSearchParams,
  context: InvocationContext
): string | HttpResponseInit {
  const teamId = query.get("teamId");
  const teamSlug = query.get("slug");
  const teamName = query.get("team");

  const team = teamId ?? teamName ?? teamSlug;
  if (!team) {
    return responseError(
      "The request query params should have either teamId or slug.",
      context
    );
  }

  return team;
}

export function parseHashFromParams(
  params: Record<string, unknown>,
  context: InvocationContext
) {
  const hash = params["hash"];

  if (!hash) {
    return responseError(
      `The request is missing the artifact hash in the URL path params.`,
      context
    );
  }

  return hash;
}

export function parseHashesFromBody(
  jsonBody: unknown,
  context: InvocationContext
) {
  const hashes =
    jsonBody &&
    typeof jsonBody === "object" &&
    "hashes" in jsonBody &&
    Array.isArray(jsonBody.hashes)
      ? jsonBody.hashes
      : undefined;

  if (!hashes) {
    return responseError(
      `The 'hashes' key is missing or invalid in request body (json).`,
      context
    );
  }

  return hashes;
}

export function parseEventsFromBody(jsonBody: unknown) {
  const events =
    jsonBody && typeof jsonBody === "object" && Array.isArray(jsonBody)
      ? jsonBody
      : [];

  return events;
}

export function parseTokenFromHeaders(
  headers: Headers,
  context: InvocationContext,
  TOKEN = process.env["TURBO_TOKEN"]
) {
  if (!TOKEN) {
    return responseError(
      "The token is not configured on server correctly",
      context,
      500
    );
  }

  const authHeader = headers.get("authorization");
  if (!authHeader) {
    return responseError(
      "The auth bearerToken is missing in Headers",
      context,
      401
    );
  }

  if (authHeader !== `Bearer ${TOKEN}`) {
    return responseError("Incorrect bearerToken in headers", context, 401);
  }

  return true;
}
