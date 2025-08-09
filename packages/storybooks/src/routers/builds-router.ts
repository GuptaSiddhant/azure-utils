import { app } from "@azure/functions";
import {
  commonErrorResponses,
  CONTENT_TYPES,
  SERVICE_NAME,
} from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import { buildSHASchema, storybookMetadataSchema } from "../utils/schemas";
import z from "zod";
import type { RouterOptions } from "../utils/types";
import { joinUrl } from "../utils/url-join";

const TAG = openAPITags.builds.name;

export function registerBuildsRouter(options: RouterOptions) {
  const { baseRoute, basePathParamsSchema, openAPI } = options;
  const routeWithBuildSHA = joinUrl(baseRoute, "{buildSHA}");

  app.get(`${SERVICE_NAME}-builds-list`, {
    route: baseRoute,
    handler: async () => {
      return { status: 500 };
    },
  });
  app.post(`${SERVICE_NAME}-build-upload`, {
    route: baseRoute,
    handler: async () => {
      return { status: 500 };
    },
  });
  app.get(`${SERVICE_NAME}-build-get`, {
    route: routeWithBuildSHA,
    handler: async () => {
      return { status: 500 };
    },
  });
  app.deleteRequest(`${SERVICE_NAME}-build-delete`, {
    route: routeWithBuildSHA,
    handler: async () => {
      return { status: 500 };
    },
  });

  // app.storageBlob(`${SERVICE_NAME}-on_uploaded`, {
  //   connection: storageConnectionStringEnvVar,
  //   path: `${storageContainerName}/{project}/{sha}/storybook.zip`,
  //   handler: onStorybookUploadedHandler(handlerOptions),
  // });

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
                schema: storybookMetadataSchema.array(),
                example: [{ project: "project-id", buildSha: "s123s14" }],
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
          query: storybookMetadataSchema,
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
                  success: z.boolean(),
                  blobName: z.string(),
                  data: storybookMetadataSchema,
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
                schema: storybookMetadataSchema,
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
