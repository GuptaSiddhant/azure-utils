import { app } from "@azure/functions";
import { commonErrorResponses, CONTENT_TYPES } from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import z from "zod";
import type { RouterOptions } from "../utils/types";
import { joinUrl } from "../utils/url-utils";
import { openAPIHandler } from "../handlers/openapi-handler";
import { rootHandler, staticFileHandler } from "../handlers/web-ui-handlers";

const TAG = openAPITags.webUI.name;

export function registerWebUIRouter(options: RouterOptions) {
  const {
    authLevel,
    baseRoute,
    basePathParamsSchema,
    handlerWrapper,
    openAPIEnabled,
    serviceName,
  } = options;

  app.get(`${serviceName}-root`, {
    authLevel,
    route: joinUrl(baseRoute),
    handler: handlerWrapper(rootHandler, [{ resource: "ui", action: "read" }]),
  });

  const healthRoute = joinUrl(baseRoute, "health");
  app.get(`${serviceName}-health-check`, {
    route: healthRoute,
    handler: handlerWrapper(() => ({ status: 200 }), []),
  });

  const staticFileRoute = joinUrl(baseRoute, "{**filepath}");
  app.get(`${serviceName}-static-files`, {
    authLevel,
    route: staticFileRoute,
    handler: handlerWrapper(staticFileHandler, [
      { resource: "ui", action: "read" },
    ]),
  });

  if (openAPIEnabled) {
    app.get(`${serviceName}-openapi`, {
      authLevel,
      route: joinUrl(baseRoute, "openapi"),
      handler: handlerWrapper(openAPIHandler, [
        { resource: "openapi", action: "read" },
      ]),
    });

    registerOpenAPIPath(baseRoute, {
      get: {
        tags: [TAG],
        summary: "Render homepage",
        requestParams: { path: basePathParamsSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "Root endpoint",
            content: { [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" } },
          },
          303: {
            description: "Redirects to all projects",
            headers: {
              Location: {
                description: "The URL to redirect to",
                schema: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
    });

    registerOpenAPIPath(healthRoute, {
      get: {
        tags: [TAG],
        summary: "Health check",
        description: "Checks the health of the service.",
        requestParams: { path: basePathParamsSchema },
        responses: {
          200: { description: "Service is healthy." },
        },
      },
    });
  }

  registerOpenAPIPath(staticFileRoute, {
    get: {
      tags: [TAG],
      summary: "Serve static files",
      requestParams: {
        path: basePathParamsSchema.extend({ "**filepath": z.string() }),
      },
      responses: {
        200: { description: "Static file served successfully." },
        404: { description: "File not found." },
      },
    },
  });
}
