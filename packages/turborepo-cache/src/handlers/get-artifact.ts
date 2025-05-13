import type { HttpHandler } from "@azure/functions";
import { createStorageClient } from "src/azure-storage";
import { responseError } from "src/utils";
import {
  parseHashFromParams,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "src/validators";

export const getArtifactHandler: HttpHandler = async (request, context) => {
  const authResult = parseTokenFromHeaders(request.headers, context);
  if (authResult !== true) return authResult;

  const hash = parseHashFromParams(request.params, context);
  if (typeof hash !== "string") return hash;

  const team = parseTeamFromQuery(request.query, context);
  if (typeof team !== "string") return team;

  context.info("Get artifact by hash", { team, hash });

  try {
    const service = createStorageClient(process.env["AzureWebJobsStorage"]!);
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
