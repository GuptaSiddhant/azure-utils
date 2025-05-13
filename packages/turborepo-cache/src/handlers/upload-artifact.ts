import { Readable } from "node:stream";
import { createStorageClient } from "../utils/azure-storage";
import { responseError } from "../utils/error-utils";
import {
  parseHashFromParams,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "../utils/validators";
import type { CacheRouterHttpHandler } from "../utils/types";

export const uploadArtifactHandler: CacheRouterHttpHandler =
  (options) => async (request, context) => {
    const authResult = parseTokenFromHeaders(
      request.headers,
      context,
      options.turboToken
    );
    if (authResult !== true) return authResult;

    const hash = parseHashFromParams(request.params, context);
    if (typeof hash !== "string") return hash;

    const team = parseTeamFromQuery(request.query, context);
    if (typeof team !== "string") return team;

    context.info("Upload artifact", { team, hash });

    const body = request.body;
    if (!body) {
      return responseError("No body found", context);
    }

    try {
      const service = await createStorageClient(options);
      await service.createCachedArtifact(hash, team, Readable.fromWeb(body));

      const result = { urls: [`${team}/${hash}`] };

      return { status: 202, jsonBody: result };
    } catch (error) {
      return responseError(error, context, 500);
    }
  };
