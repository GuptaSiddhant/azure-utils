import { app } from "@azure/functions";
import { commonErrorResponses, CONTENT_TYPES } from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import z from "zod";
import type { RouterOptions } from "../utils/types";
import * as handlers from "../handlers/project-handlers";
import { joinUrl } from "../utils/url-utils";
import { ProjectIdSchema } from "../models/shared";
import { ProjectCreateSchema, ProjectSchema } from "../models/projects";

const TAG = openAPITags.projects.name;

export function registerProjectsRouter(options: RouterOptions) {
  const {
    authLevel,
    baseRoute,
    basePathParamsSchema,
    handlerWrapper,
    openAPIEnabled,
    serviceName,
  } = options;
  const routeWithProjectId = joinUrl(baseRoute, "{projectId}");

  app.get(`${serviceName}-projects-list`, {
    authLevel,
    route: baseRoute,
    handler: handlerWrapper(handlers.listProjects, {
      resource: "project",
      action: "read",
    }),
  });
  app.post(`${serviceName}-project-create`, {
    authLevel,
    route: baseRoute,
    handler: handlerWrapper(handlers.createProject, {
      resource: "project",
      action: "create",
    }),
  });
  app.get(`${serviceName}-project-get`, {
    authLevel,
    route: routeWithProjectId,
    handler: handlerWrapper(handlers.getProject, {
      resource: "project",
      action: "read",
    }),
  });
  app.patch(`${serviceName}-project-update`, {
    authLevel,
    route: routeWithProjectId,
    handler: handlerWrapper(handlers.updateProject, {
      resource: "project",
      action: "update",
    }),
  });
  app.deleteRequest(`${serviceName}-project-delete`, {
    authLevel,
    route: routeWithProjectId,
    handler: handlerWrapper(handlers.deleteProject, {
      resource: "project",
      action: "delete",
    }),
  });

  if (openAPIEnabled) {
    const projectPathParameterSchema = basePathParamsSchema.extend({
      projectId: ProjectIdSchema,
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
                schema: ProjectSchema.array(),
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
            [CONTENT_TYPES.FORM_ENCODED]: {
              schema: ProjectCreateSchema,
            },
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
                  data: ProjectSchema,
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
                schema: ProjectSchema,
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
              schema: ProjectSchema.partial(),
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
                  data: ProjectSchema,
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
