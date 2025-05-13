import { createStorageClient } from "../utils/azure-storage";
import { responseError } from "../utils/error-utils";
import {
  parseHashFromParams,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "../utils/validators";
import type { CacheRouterHttpHandler } from "../utils/types";

export const checkArtifactExistsHandler: CacheRouterHttpHandler =
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

    context.info("Check artifact by hash", { team, hash });

    try {
      const service = await createStorageClient(options);
      await service.existsCachedArtifactOrThrow(hash, team);

      return { status: 200 };
    } catch (error) {
      return responseError(error, context, 404);
    }
  };
