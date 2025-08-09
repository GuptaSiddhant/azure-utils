import { app } from "@azure/functions";
import {
  commonErrorResponses,
  CONTENT_TYPES,
  SERVICE_NAME,
} from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import { labelSchema, storybookMetadataSchema } from "../utils/schemas";
import type { RouterOptions } from "../utils/types";
import z from "zod";
import { joinUrl } from "../utils/url-join";

const TAG = openAPITags.labels.name;

export function registerLabelsRouter(options: RouterOptions) {
  const { baseRoute, basePathParamsSchema, openAPI } = options;
  const routeWithLabel = joinUrl(baseRoute, "{label}");

  app.get(`${SERVICE_NAME}-labels-list`, {
    route: baseRoute,
    handler: async () => {
      return { status: 500 };
    },
  });
  app.get(`${SERVICE_NAME}-label-get`, {
    route: routeWithLabel,
    handler: async () => {
      return { status: 500 };
    },
  });
  app.deleteRequest(`${SERVICE_NAME}-label-delete`, {
    route: routeWithLabel,
    handler: async () => {
      return { status: 500 };
    },
  });

  const routeWithLabelLatest = joinUrl(routeWithLabel, "latest");
  app.get(`${SERVICE_NAME}-label-latest`, {
    route: routeWithLabelLatest,
    handler: async () => {
      return { status: 308 };
    },
  });

  if (openAPI) {
    const labelPathParameterSchema = basePathParamsSchema.extend({
      label: labelSchema,
    });

    registerOpenAPIPath(baseRoute, {
      get: {
        tags: [TAG],
        summary: "List all labels for the project.",
        description: "Retrieves a list of labels.",
        requestParams: { path: basePathParamsSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "A list of labels.",
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
    });

    registerOpenAPIPath(routeWithLabel, {
      get: {
        tags: [TAG],
        summary: "Get label details",
        description:
          "Retrieves the details of a specific label and all builds associated with it.",
        requestParams: { path: labelPathParameterSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "Label details retrieved successfully",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: storybookMetadataSchema,
              },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
          404: { description: "Matching label not found." },
        },
      },
      delete: {
        tags: [TAG],
        summary: "Delete a label",
        description: "Deletes a specific label and builds associated with it.",
        requestParams: { path: labelPathParameterSchema },
        responses: {
          ...commonErrorResponses,
          204: { description: "Label deleted successfully" },
          404: { description: "Matching label not found." },
        },
      },
    });

    registerOpenAPIPath(routeWithLabelLatest, {
      get: {
        tags: [TAG],
        summary: "Redirect to latest build for a label",
        description:
          "Redirects to the latest build associated with a specific label.",
        requestParams: { path: labelPathParameterSchema },
        responses: {
          ...commonErrorResponses,
          308: {
            description: "Redirecting to latest build.",
            headers: {
              Location: {
                content: z
                  .string()
                  .meta({ description: "URL of the latest build" }),
              },
            },
          },
          404: { description: "Matching label not found." },
        },
      },
    });
  }
}
