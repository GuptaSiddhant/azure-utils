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
import { queryArtifactsInfoHandler } from "./handlers/query-artifacts-info";
import { RegisterCacheRouterOptions } from "./utils/types";
import { checkArtifactExistsHandler } from "./handlers/check-artifact";
import { recordUsageEventsHandler } from "./handlers/record-usage-events";

export function registerCacheRouter(options: RegisterCacheRouterOptions = {}) {
  const { healthCheck } = options;

  app.setup({ enableHttpStream: true });

  if (healthCheck !== false) {
    app.get("health-check", {
      route: typeof healthCheck === "string" ? healthCheck : "/",
      handler: async () => ({
        body: `TurboRepo Remote Cache is up and running!`,
        status: 200,
      }),
    });
  }

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

  app.post("record-usage-events", {
    route: "/v8/artifacts/events",
    handler: recordUsageEventsHandler(options),
  });

  app.get("openapi-spec", {
    route: "/v8/openapi",
    handler: () => {
      const headers = new Headers();
      headers.set("location", "https://turborepo.com/api/remote-cache-spec");
      return { status: 308, headers };
    },
  });
}
