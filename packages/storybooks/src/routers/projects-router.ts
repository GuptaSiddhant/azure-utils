import { app } from "@azure/functions";
import {
  commonErrorResponses,
  CONTENT_TYPES,
  SERVICE_NAME,
} from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import { projectIdSchema, storybookProjectSchema } from "../utils/schemas";
import z from "zod";
import type { RouterOptions } from "../utils/types";
import * as handlers from "../handlers/project-handlers";
import { joinUrl } from "../utils/url-utils";

const TAG = openAPITags.projects.name;

export function registerProjectsRouter(options: RouterOptions) {
  const { baseRoute, basePathParamsSchema, handlerOptions, openAPI } = options;
  const routeWithProjectId = joinUrl(baseRoute, "{projectId}");

  app.get(`${SERVICE_NAME}-projects-list`, {
    route: baseRoute,
    handler: handlers.listProjects.bind(null, handlerOptions),
  });
  app.post(`${SERVICE_NAME}-project-create`, {
    route: baseRoute,
    handler: handlers.createProject.bind(null, handlerOptions),
  });
  app.get(`${SERVICE_NAME}-project-get`, {
    route: routeWithProjectId,
    handler: handlers.getProject.bind(null, handlerOptions),
  });
  app.patch(`${SERVICE_NAME}-project-update`, {
    route: routeWithProjectId,
    handler: handlers.updateProject.bind(null, handlerOptions),
  });
  app.deleteRequest(`${SERVICE_NAME}-project-delete`, {
    route: routeWithProjectId,
    handler: handlers.deleteProject.bind(null, handlerOptions),
  });

  if (openAPI) {
    const projectPathParameterSchema = basePathParamsSchema.extend({
      projectId: projectIdSchema,
    });

    registerOpenAPIPath(baseRoute, {
      get: {
        tags: [TAG],
        summary: "List all projects",
        description: "Retrieves a list of projects.",
        requestParams: { path: basePathParamsSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "A list of projects.",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: storybookProjectSchema.array(),
                example: [{ project: "project-id" }],
              },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
        },
      },
      post: {
        tags: [TAG],
        summary: "Create a new project",
        description: "Creates a new project with the provided metadata.",
        requestBody: {
          required: true,
          description: "Data about the project",
          content: {
            [CONTENT_TYPES.FORM_ENCODED]: { schema: storybookProjectSchema },
          },
        },
        requestParams: { path: basePathParamsSchema },
        responses: {
          ...commonErrorResponses,
          201: {
            description: "Project created successfully",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: z.object({
                  data: storybookProjectSchema,
                  links: z.object({ self: z.url() }),
                }),
              },
            },
          },
          303: {
            description: "Project created, redirecting...",
            headers: { Location: z.url() },
          },
          415: { description: "Unsupported Media Type" },
        },
      },
    });

    registerOpenAPIPath(routeWithProjectId, {
      get: {
        tags: [TAG],
        summary: "Get project details",
        description: "Retrieves the details of a specific project.",
        requestParams: { path: projectPathParameterSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "Project details retrieved successfully",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: storybookProjectSchema,
              },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
          404: { description: "Matching project not found." },
        },
      },
      patch: {
        tags: [TAG],
        summary: "Update project details",
        description: "Updates the details of a specific project.",
        requestParams: { path: projectPathParameterSchema },
        requestBody: {
          required: true,
          description: "Updated project data",
          content: {
            [CONTENT_TYPES.FORM_ENCODED]: {
              schema: storybookProjectSchema.partial(),
            },
          },
        },
        responses: {
          ...commonErrorResponses,
          202: {
            description: "Project updated successfully",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: z.object({
                  data: storybookProjectSchema,
                  links: z.object({ self: z.url() }),
                }),
              },
            },
          },
          303: {
            description: "Project updated, redirecting...",
            headers: { Location: z.url() },
          },
          404: { description: "Matching project not found." },
          415: { description: "Unsupported Media Type" },
        },
      },
      delete: {
        tags: [TAG],
        summary: "Delete a project",
        description: "Deletes a specific project.",
        requestParams: { path: projectPathParameterSchema },
        responses: {
          ...commonErrorResponses,
          204: { description: "Project deleted successfully" },
          404: { description: "Matching project not found." },
        },
      },
    });
  }
}
