import { app } from "@azure/functions";
import { commonErrorResponses } from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import type { RouterOptions } from "../utils/types";
import z from "zod";
import { joinUrl } from "../utils/url-utils";
import { serveStorybook } from "../handlers/storybook-handler";
import { BuildSHASchema, ProjectIdSchema } from "#utils/shared-model";

const TAG = openAPITags.storybook.name;

export function registerStorybookRouter(options: RouterOptions) {
  const {
    authLevel,
    baseRoute,
    basePathParamsSchema,
    handlerWrapper,
    openAPIEnabled,
    serviceName,
  } = options;

  const storybookRoute = joinUrl(
    baseRoute,
    "{projectId}",
    "{buildSHA}",
    "{**filepath}"
  );

  app.get(`${serviceName}-serve-storybook`, {
    authLevel,
    route: storybookRoute,
    handler: handlerWrapper(serveStorybook, [
      { resource: "build", action: "read" },
    ]),
  });

  if (openAPIEnabled) {
    registerOpenAPIPath(storybookRoute, {
      get: {
        tags: [TAG],
        summary: "List all projects",
        description: "Retrieves a list of projects.",
        requestParams: {
          path: basePathParamsSchema.extend({
            projectId: ProjectIdSchema,
            buildSHA: BuildSHASchema,
            "**filepath": z.string().meta({
              description: "The path to the storybook files.",
              example: "index.html",
            }),
          }),
        },
        responses: {
          ...commonErrorResponses,
          200: { description: "Serve the file." },
          404: { description: "File not found." },
        },
      },
    });
  }
}
