import { AsyncLocalStorage } from "node:async_hooks";
import type {
  HttpHandler,
  HttpRequest,
  InvocationContext,
} from "@azure/functions";
import { CheckPermissionsCallback, OpenAPIOptions, Permission } from "./types";
import { responseError } from "./response-utils";

/**
 * @private
 * Options for linking with Azure Blob Storage
 */
interface RouterHandlerOptions {
  authLevel?: "admin";
  serviceName: string;
  connectionString: string;
  baseRoute: string;
  staticDirs: string[];
  openapi: OpenAPIOptions | undefined;
  checkPermissions: CheckPermissionsCallback;
}

type Store = RouterHandlerOptions & {
  accept: string | null;
  locale: string | undefined;
  url: string;
  connectionString: string;
  baseRoute: string;
  request: HttpRequest;
  context: InvocationContext;
};

const store = new AsyncLocalStorage<Store>();

export function getStore(throwError: false): Store | undefined;
export function getStore(throwError?: true): Store;
export function getStore(throwError?: boolean) {
  const value = store.getStore();
  if (!value && throwError !== false) {
    throw new Error("Request store not found.");
  }

  return value;
}

export function wrapHttpHandlerWithStore(
  options: RouterHandlerOptions,
  handler: HttpHandler,
  permissions: Permission[]
): HttpHandler {
  return function (request, context) {
    const locale = request.headers.get("accept-language")?.split(",")[0];
    const accept = request.headers.get("accept");
    const storeValue: Store = {
      ...options,
      accept,
      locale,
      url: request.url,
      request,
      context,
    };

    return store.run(storeValue, async () => {
      if (!permissions || permissions.length === 0) {
        return handler(request, context);
      }

      const { checkPermissions } = options;
      const { projectId } = request.params;

      const permitted = await checkPermissions(
        permissions.map((p) => ({ projectId, ...p })),
        context,
        request
      );

      if (permitted === true) {
        return handler(request, context);
      }

      const message = `Permission denied [${permissions
        .map((p) => `'${p.resource}:${p.action}'`)
        .join(", ")}] (project: ${projectId})`;
      if (permitted === false) {
        return responseError(message, context, 403);
      }
      if (typeof permitted === "object" && "status" in permitted) {
        context.warn(message);
        return permitted;
      }
      if (permitted instanceof Response) {
        context.warn(message);
        return permitted;
      }

      return handler(request, context);
    });
  };
}
