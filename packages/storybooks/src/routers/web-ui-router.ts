import { app } from "@azure/functions";
import {
  commonErrorResponses,
  CONTENT_TYPES,
  SERVICE_NAME,
} from "../utils/constants";
import { openAPITags, registerOpenAPIPath } from "../utils/openapi-utils";
import z from "zod";
import type { RouterOptions } from "../utils/types";
import { joinUrl } from "../utils/url-join";

const TAG = openAPITags.webUI.name;

export function registerWebUIRouter(options: RouterOptions) {
  const { baseRoute, basePathParamsSchema, openAPI } = options;

  app.get(`${SERVICE_NAME}-root`, {
    route: joinUrl(baseRoute),
    handler: async () => {
      return { status: 200 };
    },
  });

  // Account
  const accountRoute = joinUrl(baseRoute, "account");
  app.get(`${SERVICE_NAME}-account-details`, {
    route: accountRoute,
    handler: async () => {
      return { status: 500 };
    },
  });

  const logoutRoute = joinUrl(baseRoute, "logout");
  app.get(`${SERVICE_NAME}-account-logout`, {
    route: logoutRoute,
    handler: async () => {
      return { status: 500 };
    },
  });

  // Health check
  const healthRoute = joinUrl(baseRoute, "health");
  app.get(`${SERVICE_NAME}-health-check`, {
    route: healthRoute,
    handler: async () => {
      return { status: 200 };
    },
  });

  const staticFIleRoute = joinUrl(baseRoute, "**filepath");
  app.get(`${SERVICE_NAME}-static-files`, {
    route: staticFIleRoute,
    handler: async () => {
      return { status: 404 };
    },
  });

  if (openAPI) {
    registerOpenAPIPath(baseRoute, {
      get: {
        tags: [TAG],
        summary: "Render homepage",
        requestParams: { path: basePathParamsSchema },
        responses: {
          200: {
            description: "Root endpoint",
            content: { [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" } },
          },
        },
      },
    });

    registerOpenAPIPath(staticFIleRoute, {
      get: {
        tags: [TAG],
        summary: "Serve static files",
        requestParams: {
          path: basePathParamsSchema.extend({ "**filepath": z.string() }),
        },
        responses: {
          200: { description: "Static file served successfully." },
          404: { description: "File not found." },
        },
      },
    });

    registerOpenAPIPath(accountRoute, {
      get: {
        tags: [TAG],
        summary: "Logged in user details",
        description: "Retrieves the details of the logged-in user.",
        requestParams: { path: basePathParamsSchema },
        responses: {
          ...commonErrorResponses,
          200: {
            description: "User details retrieved successfully.",
            content: {
              [CONTENT_TYPES.JSON]: {
                schema: z.object({ username: z.string() }),
              },
              [CONTENT_TYPES.HTML]: { example: "<!DOCTYPE html>" },
            },
          },
        },
      },
    });
    registerOpenAPIPath(logoutRoute, {
      get: {
        tags: [TAG],
        summary: "Logged out user",
        description: "Logs out the current user.",
        requestParams: { path: basePathParamsSchema },
        responses: {
          ...commonErrorResponses,
          200: { description: "User logged out successfully." },
          302: {
            description: "Logged out, redirecting to home.",
            headers: {
              Location: {
                description: "Redirects to the home page after logout.",
                schema: z.string(),
              },
            },
          },
        },
      },
    });

    registerOpenAPIPath(healthRoute, {
      get: {
        tags: [TAG],
        summary: "Health check",
        description: "Checks the health of the service.",
        requestParams: { path: basePathParamsSchema },
        responses: {
          200: { description: "Service is healthy." },
        },
      },
    });
  }
}
