import { app } from "@azure/functions";
import { commonErrorResponses, CONTENT_TYPES } from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import { labelSlugSchema, storybookLabelSchema } from "../utils/schemas";
import type { RouterOptions } from "../utils/types";
import z from "zod";
import { joinUrl } from "../utils/url-utils";
import * as handlers from "../handlers/label-handlers";

const TAG = openAPITags.labels.name;

export function registerLabelsRouter(options: RouterOptions) {
  const {
    baseRoute,
    basePathParamsSchema,
    handlerWrapper,
    openAPIEnabled,
    serviceName,
  } = options;

  app.get(`${serviceName}-labels-list`, {
    route: baseRoute,
    handler: handlerWrapper(handlers.listLabels, {
      resource: "label",
      action: "read",
    }),
  });

  const routeWithLabel = joinUrl(baseRoute, "{labelSlug}");
  app.get(`${serviceName}-label-get`, {
    route: routeWithLabel,
    handler: handlerWrapper(handlers.getLabel, {
      resource: "label",
      action: "read",
    }),
  });
  app.deleteRequest(`${serviceName}-label-delete`, {
    route: routeWithLabel,
    handler: handlerWrapper(handlers.deleteLabel, {
      resource: "label",
      action: "delete",
    }),
  });

  const routeWithLabelLatest = joinUrl(routeWithLabel, "latest");
  app.get(`${serviceName}-label-latest`, {
    route: routeWithLabelLatest,
    handler: handlerWrapper(handlers.getLabelLatestBuild, {
      resource: "label",
      action: "read",
    }),
  });

  if (openAPIEnabled) {
    const labelPathParameterSchema = basePathParamsSchema.extend({
      labelSlug: labelSlugSchema,
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
                schema: storybookLabelSchema.array(),
                example: [{ slug: "label-slug", value: "label/slug" }],
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
              [CONTENT_TYPES.JSON]: { schema: storybookLabelSchema },
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
          404: { description: "Matching label or build not found." },
        },
      },
    });
  }
}
