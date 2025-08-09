import { app } from "@azure/functions";
import {
  commonErrorResponses,
  CONTENT_TYPES,
  SERVICE_NAME,
} from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import {
  buildSHASchema,
  storybookBuildSchema,
  storybookBuildUploadSchema,
} from "../utils/schemas";
import z from "zod";
import type { RouterOptions } from "../utils/types";
import { joinUrl } from "../utils/url-utils";
import * as handlers from "../handlers/build-handlers";

const TAG = openAPITags.builds.name;

export function registerBuildsRouter(options: RouterOptions) {
  const { baseRoute, basePathParamsSchema, handlerOptions, openAPI } = options;
  const routeWithBuildSHA = joinUrl(baseRoute, "{buildSHA}");

  app.get(`${SERVICE_NAME}-builds-list`, {
    route: baseRoute,
    handler: handlers.listBuilds.bind(null, handlerOptions),
  });
  app.post(`${SERVICE_NAME}-build-upload`, {
    route: baseRoute,
    handler: handlers.uploadBuild.bind(null, handlerOptions),
  });
  app.get(`${SERVICE_NAME}-build-get`, {
    route: routeWithBuildSHA,
    handler: handlers.getBuild.bind(null, handlerOptions),
  });
  app.deleteRequest(`${SERVICE_NAME}-build-delete`, {
    route: routeWithBuildSHA,
    handler: handlers.deleteBuild.bind(null, handlerOptions),
  });

  if (openAPI) {
    const buildPathParameterSchema = basePathParamsSchema.extend({
      buildSHA: buildSHASchema,
    });

    registerOpenAPIPath(baseRoute, {
      get: {
        tags: [TAG],
        summary: "List all builds for the project.",
        description: "Retrieves a list of builds.",
        requestParams: { path: basePathParamsSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "A list of builds.",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: storybookBuildSchema.array(),
                example: [{ project: "project-id", sha: "s123s14" }],
              },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
        },
      },
      post: {
        tags: [TAG],
        summary: "Upload a new build",
        description: "Uploads a new build with the provided metadata.",
        requestParams: {
          path: basePathParamsSchema,
          query: storybookBuildUploadSchema,
        },
        requestBody: {
          required: true,
          description: "Compressed zip containing storybook and test results.",
          content: {
            [CONTENT_TYPES.ZIP]: {
              schema: { type: "string", format: "binary" },
              example: "storybook.zip",
            },
          },
        },
        responses: {
          ...commonErrorResponses,
          202: {
            description: "Build uploaded successfully",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: z.object({
                  blobName: z.string(),
                  data: storybookBuildSchema,
                }),
              },
            },
          },
        },
      },
    });

    registerOpenAPIPath(routeWithBuildSHA, {
      get: {
        tags: [TAG],
        summary: "Get build details",
        description: "Retrieves the details of a specific build.",
        requestParams: { path: buildPathParameterSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "Build details retrieved successfully",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: storybookBuildSchema,
              },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
          404: { description: "Matching build not found." },
        },
      },
      delete: {
        tags: [TAG],
        summary: "Delete a build",
        description: "Deletes a specific build.",
        requestParams: { path: buildPathParameterSchema },
        responses: {
          ...commonErrorResponses,
          204: { description: "Build deleted successfully" },
          404: { description: "Matching build not found." },
        },
      },
    });
  }
}
