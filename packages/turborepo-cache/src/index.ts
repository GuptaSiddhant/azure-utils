/**
 * Module exports a single function to register
 * the TurboRepo Remote Cache router.
 *
 * @see https://turborepo.com/docs/openapi
 *
 * @module
 */

import { app } from "@azure/functions";
import { checkServiceStatusHandler } from "./handlers/check-service-status";
import { downloadArtifactHandler } from "./handlers/get-artifact";
import { uploadArtifactHandler } from "./handlers/upload-artifact";
import { queryArtifactsInfoHandler } from "./handlers/get-all-artifacts";
import { RegisterCacheRouterOptions } from "./utils/types";
import { checkArtifactExistsHandler } from "./handlers/check-artifact";

export function registerCacheRouter(options: RegisterCacheRouterOptions = {}) {
  app.setup({ enableHttpStream: true });

  app.get("health-check", {
    route: "/",
    handler: async () => ({
      body: `TurboRepo Remote Cache is up and running!`,
      status: 200,
    }),
  });

  app.get("check-service-status", {
    route: "/v8/artifacts/status",
    handler: checkServiceStatusHandler(options),
  });

  app.post("query-artifacts-info", {
    route: "/v8/artifacts",
    handler: queryArtifactsInfoHandler(options),
  });

  app.http("check-artifact-exists", {
    methods: ["HEAD"],
    route: "/v8/artifacts/{hash}",
    handler: checkArtifactExistsHandler(options),
  });

  app.get("download-artifact", {
    route: "/v8/artifacts/{hash}",
    handler: downloadArtifactHandler(options),
  });

  app.put("upload-artifact", {
    route: "/v8/artifacts/{hash}",
    handler: uploadArtifactHandler(options),
  });
}
