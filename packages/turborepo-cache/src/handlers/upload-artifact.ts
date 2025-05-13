import { Readable } from "node:stream";
import type { HttpHandler } from "@azure/functions";
import { createStorageClient } from "src/azure-storage";
import { responseError } from "src/utils";
import {
  parseHashFromParams,
  parseTeamFromQuery,
  parseTokenFromHeaders,
} from "src/validators";

export const uploadArtifactHandler: HttpHandler = async (request, context) => {
  const authResult = parseTokenFromHeaders(request.headers, context);
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
    const service = createStorageClient(process.env["AzureWebJobsStorage"]!);
    await service.createCachedArtifact(hash, team, Readable.fromWeb(body));

    const result = { urls: [`${team}/${hash}`] };

    return { status: 202, jsonBody: result };
  } catch (error) {
    return responseError(error, context, 500);
  }
};
