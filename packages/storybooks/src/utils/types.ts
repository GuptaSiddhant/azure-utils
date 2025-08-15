import type {
  HttpHandler,
  HttpRequest,
  HttpResponse,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import type z from "zod";

/**
 * Type for the callback function to check permissions.
 *
 * Return true to allow access, or following to deny:
 * - false - returns 403 response
 * - HttpResponse - returns the specified HTTP response
 */
export type CheckPermissionsCallback = (
  permissions: Permission[],
  request: HttpRequest,
  context: InvocationContext
) =>
  | boolean
  | HttpResponse
  | HttpResponseInit
  | Promise<boolean | HttpResponse | HttpResponseInit>;
/**
 * Type of permission to check
 */
export type Permission = {
  resource: PermissionResource;
  action: PermissionAction;
  projectId?: string;
};
/**
 * Type of possible resources to check permissions for
 */
export type PermissionResource =
  | "project"
  | "build"
  | "label"
  | "openapi"
  | "ui";
/**
 * Type of possible actions to check permissions for
 */
export type PermissionAction = "create" | "read" | "update" | "delete";

export interface OpenAPIOptions {
  /**
   * Enable or disable openAPI schema endpoint.
   * @default false
   */
  disabled?: boolean;
  /**
   * Title of the OpenAPI schema
   * @default SERVICE_NAME (storybooks)
   */
  title?: string;
  /**
   * A version visible in the OpenAPI schema.
   * @default process.env['NODE_ENV']
   */
  version?: string;
  /**
   * Servers to be included in the OpenAPI schema.
   */
  servers?: Array<{
    url: string;
    description?: string;
    variables?: Record<
      string,
      {
        enum?: string[] | boolean[] | number[];
        default: string | boolean | number;
        description?: string;
      }
    >;
  }>;
}

/**
 * @private
 * Options for configuring the router
 */
export interface RouterOptions {
  /**
   * Whether the router requires authentication.
   */
  authLevel?: "admin";
  /**
   * Name of the service
   */
  serviceName: string;
  /**
   * The base route for the router.
   */
  baseRoute: string;
  /**
   * Enable or disable OpenAPI schema generation.
   */
  openAPIEnabled: boolean;
  /**
   * A base schema for path parameters based on baseRoute.
   */
  basePathParamsSchema: z.ZodObject;

  /**
   * A wrapper function for the HTTP handler.
   * It adds request-specific context to the handler.
   */
  handlerWrapper: (
    handler: HttpHandler,
    permissions: Permission[]
  ) => HttpHandler;
}
