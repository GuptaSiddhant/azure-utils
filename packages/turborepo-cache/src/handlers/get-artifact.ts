import { createStorageClient } from "../utils/azure-storage";
import { responseError } from "../utils/error-utils";
import {
  parseHashFromParams,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "../utils/validators";
import type { CacheRouterHttpHandler } from "../utils/types";

export const downloadArtifactHandler: CacheRouterHttpHandler =
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

    context.info("Get artifact by hash", { team, hash });

    try {
      const service = await createStorageClient(options);
      const artifact = await service.getCachedArtifactOrThrow(hash, team);

      return {
        status: 200,
        body: artifact,
        headers: { "Content-Type": "application/octet-stream" },
      };
    } catch (error) {
      return responseError(error, context, 404);
    }
  };
