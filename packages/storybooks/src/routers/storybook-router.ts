import { app } from "@azure/functions";
import { commonErrorResponses, SERVICE_NAME } from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import type { RouterOptions } from "../utils/types";
import z from "zod";
import { buildSHASchema, projectIdSchema } from "../utils/schemas";
import { joinUrl } from "../utils/url-utils";
import { serveStorybook } from "../handlers/storybook-handler";

const TAG = openAPITags.storybook.name;

export function registerStorybookRouter(options: RouterOptions) {
  const { baseRoute, basePathParamsSchema, handlerWrapper, openAPI } = options;

  const storybookRoute = joinUrl(
    baseRoute,
    "{projectId}",
    "{buildSHA}",
    "{**filepath}"
  );

  app.get(`${SERVICE_NAME}-storybook-serve`, {
    route: storybookRoute,
    handler: handlerWrapper(serveStorybook),
  });

  if (openAPI) {
    registerOpenAPIPath(storybookRoute, {
      get: {
        tags: [TAG],
        summary: "List all projects",
        description: "Retrieves a list of projects.",
        requestParams: {
          path: basePathParamsSchema.extend({
            projectId: projectIdSchema,
            buildSHA: buildSHASchema,
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
