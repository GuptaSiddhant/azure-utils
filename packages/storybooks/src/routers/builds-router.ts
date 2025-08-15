import { app } from "@azure/functions";
import { commonErrorResponses, CONTENT_TYPES } from "#utils/constants";
import { openAPITags, registerOpenAPIPath } from "#utils/openapi-utils";
import type { RouterOptions } from "#utils/types";
import { joinUrl } from "#utils/url-utils";
import * as handlers from "#handlers/build-handlers";
import { BuildSHASchema } from "#utils/shared-model";
import { BuildSchema, BuildUploadSchema } from "#builds/schema";

const TAG = openAPITags.builds.name;

export function registerBuildsRouter(options: RouterOptions) {
  const {
    authLevel,
    baseRoute,
    basePathParamsSchema,
    handlerWrapper,
    openAPIEnabled,
    serviceName,
  } = options;
  const routeWithBuildSHA = joinUrl(baseRoute, "{buildSHA}");

  app.get(`${serviceName}-builds-list`, {
    authLevel,
    route: baseRoute,
    handler: handlerWrapper(handlers.listBuilds, [
      { resource: "build", action: "read" },
      { resource: "ui", action: "read" },
    ]),
  });
  app.post(`${serviceName}-build-upload`, {
    authLevel,
    route: baseRoute,
    handler: handlerWrapper(handlers.uploadBuild, [
      { resource: "build", action: "create" },
    ]),
  });
  app.get(`${serviceName}-build-get`, {
    authLevel,
    route: routeWithBuildSHA,
    handler: handlerWrapper(handlers.getBuild, [
      { resource: "build", action: "read" },
      { resource: "ui", action: "read" },
    ]),
  });
  app.deleteRequest(`${serviceName}-build-delete`, {
    authLevel,
    route: routeWithBuildSHA,
    handler: handlerWrapper(handlers.deleteBuild, [
      { resource: "build", action: "delete" },
    ]),
  });

  if (openAPIEnabled) {
    const buildPathParameterSchema = basePathParamsSchema.extend({
      buildSHA: BuildSHASchema,
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
                schema: BuildSchema.array(),
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
          query: BuildUploadSchema,
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
          202: { description: "Build uploaded successfully" },
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
                schema: BuildSchema,
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
