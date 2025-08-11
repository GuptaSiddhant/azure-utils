import { AsyncLocalStorage } from "node:async_hooks";
import type {
  HttpHandler,
  HttpRequest,
  InvocationContext,
} from "@azure/functions";
import { Permission, RouterHandlerOptions } from "./types";
import { responseError } from "./response-utils";

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
  permission: Permission | undefined
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
      if (!permission) {
        return handler(request, context);
      }

      const { checkPermission } = options;
      const { projectId = permission.projectId } = request.params;

      const permitted = await checkPermission(
        { projectId, ...permission },
        context,
        request
      );

      if (permitted === true) {
        return handler(request, context);
      }

      const message = `Permission denied '${permission.resource}:${permission.action}' (project: ${projectId})`;
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
