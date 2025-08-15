import { app } from "@azure/functions";
import z from "zod";
import { commonErrorResponses, CONTENT_TYPES } from "#utils/constants";
import { openAPITags, registerOpenAPIPath } from "#utils/openapi-utils";
import type { RouterOptions } from "#utils/types";
import { joinUrl } from "#utils/url-utils";
import * as handlers from "#handlers/label-handlers";
import { LabelSlugSchema } from "#utils/shared-model";
import {
  LabelCreateSchema,
  LabelSchema,
  LabelUpdateSchema,
} from "#labels/schema";

const TAG = openAPITags.labels.name;

export function registerLabelsRouter(options: RouterOptions) {
  const {
    authLevel,
    baseRoute,
    basePathParamsSchema,
    handlerWrapper,
    openAPIEnabled,
    serviceName,
  } = options;

  app.get(`${serviceName}-labels-list`, {
    authLevel,
    route: baseRoute,
    handler: handlerWrapper(handlers.listLabels, [
      { resource: "label", action: "read" },
      { resource: "ui", action: "read" },
    ]),
  });

  app.post(`${serviceName}-label-create`, {
    authLevel,
    route: baseRoute,
    handler: handlerWrapper(handlers.createLabel, [
      { resource: "label", action: "create" },
    ]),
  });

  const routeWithLabel = joinUrl(baseRoute, "{labelSlug}");
  app.get(`${serviceName}-label-get`, {
    authLevel,
    route: routeWithLabel,
    handler: handlerWrapper(handlers.getLabel, [
      { resource: "label", action: "read" },
      { resource: "ui", action: "read" },
    ]),
  });
  app.patch(`${serviceName}-label-update`, {
    authLevel,
    route: routeWithLabel,
    handler: handlerWrapper(handlers.updateLabel, [
      { resource: "label", action: "update" },
    ]),
  });
  app.deleteRequest(`${serviceName}-label-delete`, {
    authLevel,
    route: routeWithLabel,
    handler: handlerWrapper(handlers.deleteLabel, [
      { resource: "label", action: "delete" },
    ]),
  });

  const routeWithLabelLatest = joinUrl(routeWithLabel, "latest");
  app.get(`${serviceName}-label-latest`, {
    authLevel,
    route: routeWithLabelLatest,
    handler: handlerWrapper(handlers.getLabelLatestBuild, [
      { resource: "label", action: "read" },
    ]),
  });

  if (openAPIEnabled) {
    const labelPathParameterSchema = basePathParamsSchema.extend({
      labelSlug: LabelSlugSchema,
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
                schema: LabelSchema.array(),
                example: [{ slug: "label-slug", value: "label/slug" }],
              },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
        },
      },
      post: {
        tags: [TAG],
        summary: "Create a new label.",
        description: "Create a new label with slug and type.",
        requestParams: { path: basePathParamsSchema },
        requestBody: {
          content: {
            [CONTENT_TYPES.FORM_ENCODED]: { schema: LabelCreateSchema },
          },
        },
        responses: {
          ...commonErrorResponses,
          202: {
            description: "Data about label",
            content: { [CONTENT_TYPES.JSON]: { schema: LabelSchema } },
          },
          303: {
            description: "Label created, redirecting...",
            headers: { Location: z.url() },
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
              [CONTENT_TYPES.JSON]: { schema: LabelSchema },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
          404: { description: "Matching label not found." },
        },
      },
      patch: {
        tags: [TAG],
        summary: "Update label details",
        description: "Update the label",
        requestParams: { path: labelPathParameterSchema },
        requestBody: {
          content: {
            [CONTENT_TYPES.FORM_ENCODED]: { schema: LabelUpdateSchema },
          },
        },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "Label details retrieved successfully",
            content: {
              [CONTENT_TYPES.JSON]: { schema: LabelSchema },
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
