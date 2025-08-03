/**
 * Module exports a single function to register
 * the Storybooks management endpoints.
 *
 * @module
 */

import { app } from "@azure/functions";
import type {
  RegisterStorybooksRouterOptions,
  RouterHandlerOptions,
} from "./utils/types";
import {
  CONTENT_TYPES,
  DEFAULT_CONTAINER_NAME,
  DEFAULT_PURGE_AFTER_DAYS,
  DEFAULT_PURGE_SCHEDULE_CRON,
  DEFAULT_STORAGE_CONN_STR_ENV_VAR,
  SERVICE_NAME,
} from "./utils/constants";
import { uploadStorybookHandler } from "./handlers/upload-handler";
import { onStorybookUploadedHandler } from "./handlers/on-uploaded-handler";
import { serveStorybookHandler } from "./handlers/serve-handler";
import { deleteStorybookHandler } from "./handlers/delete-handler";
import { timerPurgeHandler } from "./handlers/timer-purge-handler";
import { openAPIHandler } from "./handlers/openapi-handler";
import { registerOpenAPIPath } from "./utils/openapi-utils";
import {
  storybookDeleteQueryParamsSchema,
  storybookUploadQueryParamsSchema,
} from "./utils/schemas";
import z from "zod";

export type { RegisterStorybooksRouterOptions };

// /**
//  * OpenAPI Registry for definitions of all routes exposed from Storybooks router.
//  * Can be use to generate schema.
//  */
// export const storybooksOpenAPIRegistry = registry;

/**
 * Function to register all routes required to manage the Storybooks including
 * GET, POST and DELETE methods.
 */
export function registerStorybooksRouter(
  options: RegisterStorybooksRouterOptions = {}
) {
  const {
    authLevel,
    route = "",
    storageConnectionStringEnvVar = DEFAULT_STORAGE_CONN_STR_ENV_VAR,
    storageContainerName = DEFAULT_CONTAINER_NAME,
    purgeScheduleCron,
    purgeAfterDays = DEFAULT_PURGE_AFTER_DAYS,
    openapi,
  } = options;

  const storageConnectionString = process.env[storageConnectionStringEnvVar];

  if (!storageConnectionString) {
    throw new Error(
      "Missing env-var '${storageConnectionStringEnvVar}' value.\n" +
        "It is required to connect with Azure Storage resource."
    );
  }

  const handlerOptions: RouterHandlerOptions = {
    containerName: storageContainerName,
    connectionString: storageConnectionString,
    purgeAfterDays,
  };

  const entryRoute = route ? (route.endsWith("/") ? route : `${route}/`) : "";
  const fullRoute = `${entryRoute}{**path}`;

  console.log({ entryRoute });

  app.setup({ enableHttpStream: true });

  if (openapi?.enabled !== false) {
    app.http(`${SERVICE_NAME}-openapi`, {
      authLevel,
      route: `${entryRoute}openapi`,
      methods: ["GET"],
      handler: openAPIHandler(openapi),
    });
  }

  app.http(`${SERVICE_NAME}-upload`, {
    authLevel,
    route: entryRoute || "/",
    methods: ["POST"],
    handler: uploadStorybookHandler(handlerOptions),
  });
  registerOpenAPIPath(entryRoute, {
    post: {
      tags: ["Storybook"],
      summary: "Upload a storybook to a project",
      requestParams: {
        query: storybookUploadQueryParamsSchema,
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
        202: {
          description: "Storybook(s) uploaded successfully",
          content: {
            [CONTENT_TYPES.JSON]: {
              schema: z.object({
                success: z.boolean(),
                blobName: z.string(),
                metadata: storybookUploadQueryParamsSchema,
              }),
            },
          },
        },
        400: { description: "Invalid request data" },
        500: { description: "An unexpected server-error occurred." },
      },
    },
  });

  app.http(`${SERVICE_NAME}-create-project`, {
    authLevel,
    route: `${entryRoute}projects`,
    methods: ["POST"],
    handler: uploadStorybookHandler(handlerOptions),
  });

  app.http(`${SERVICE_NAME}-delete`, {
    authLevel,
    route: entryRoute || "/",
    methods: ["DELETE"],
    handler: deleteStorybookHandler(handlerOptions),
  });
  registerOpenAPIPath(entryRoute, {
    delete: {
      tags: ["Storybook"],
      summary: "Delete uploaded storybook(s) by commit SHA or branch-name",
      requestParams: {
        query: storybookDeleteQueryParamsSchema,
      },
      responses: {
        204: { description: "Storybook(s) deleted successfully" },
        400: { description: "Invalid request data" },
        404: { description: "Matching storybook(s) not found." },
        500: { description: "An unexpected server-error occurred." },
      },
    },
  });

  app.http(`${SERVICE_NAME}-serve`, {
    authLevel,
    route: fullRoute,
    methods: ["GET"],
    handler: serveStorybookHandler(handlerOptions),
  });
  registerOpenAPIPath(entryRoute, {
    get: {
      tags: ["Storybook"],
      summary: "List all projects",
      responses: {
        200: {
          description: "List of projects",
          content: {
            [CONTENT_TYPES.JSON]: {
              schema: storybookUploadQueryParamsSchema.array(),
              example: [{ project: "project-id" }],
            },
            [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
          },
        },
        400: { description: "Invalid request data" },
        500: { description: "An unexpected server-error occurred." },
      },
    },
  });
  registerOpenAPIPath(`${entryRoute}{project}`, {
    get: {
      tags: ["Storybook"],
      summary: "List all storybooks/commits in a project",
      requestParams: {
        path: z.object({
          project: z.string().meta({ description: "ID of the project" }),
        }),
      },
      responses: {
        200: {
          description: "List of storybooks/commits",
          content: {
            [CONTENT_TYPES.JSON]: {
              schema: storybookUploadQueryParamsSchema.array(),
              example: [{ project: "project-id", commitSha: "sd23d1A" }],
            },
            [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
          },
        },
        400: { description: "Invalid request data" },
        404: { description: "Matching project not found." },
        500: { description: "An unexpected server-error occurred." },
      },
    },
  });
  registerOpenAPIPath(`${entryRoute}{project}/{commitSha}`, {
    get: {
      tags: ["Storybook"],
      summary: "List all storybooks/commits in a project",
      requestParams: {
        path: z.object({
          project: z.string().meta({ description: "ID of the project" }),
          commitSha: z
            .string()
            .meta({ description: "Commit hash for Storybook" }),
        }),
      },
      responses: {
        200: {
          description: "Details about a Storybook",
          content: {
            [CONTENT_TYPES.JSON]: {
              schema: storybookUploadQueryParamsSchema,
              example: { project: "project-id", commitSha: "sd23d1A" },
            },
            [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
          },
        },
        400: { description: "Invalid request data" },
        404: { description: "Matching Storybook not found." },
        500: { description: "An unexpected server-error occurred." },
      },
    },
  });
  registerOpenAPIPath(`${entryRoute}{project}/{commitSha}/{**filepath}`, {
    get: {
      tags: ["Storybook"],
      summary: "Serve Storybook file",
      requestParams: {
        path: z.object({
          project: z.string().meta({ description: "ID of the project" }),
          commitSha: z
            .string()
            .meta({ description: "Commit hash for Storybook" }),
          "**filepath": z
            .string()
            .meta({ description: "Path to Storybook file" }),
        }),
      },
      responses: {
        200: { description: "File found and served" },
        400: { description: "Invalid request data" },
        404: { description: "Matching storybook(s) file not found." },
        500: { description: "An unexpected server-error occurred." },
      },
    },
  });

  app.storageBlob(`${SERVICE_NAME}-on_uploaded`, {
    connection: storageConnectionStringEnvVar,
    path: `${storageContainerName}/{project}/{sha}/storybook.zip`,
    handler: onStorybookUploadedHandler(handlerOptions),
  });

  if (purgeScheduleCron !== null) {
    app.timer(`${SERVICE_NAME}-timer_purge`, {
      schedule: purgeScheduleCron || DEFAULT_PURGE_SCHEDULE_CRON,
      runOnStartup: true,
      handler: timerPurgeHandler(handlerOptions),
    });
  }
}
