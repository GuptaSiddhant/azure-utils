import type { HttpHandler, TimerHandler } from "@azure/functions";
import type { TableEntityResult } from "@azure/data-tables";
import type { StorybookBuild, StorybookProject } from "./schemas";
import z from "zod";

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
 * Options for linking with Azure Blob Storage
 */
export interface RouterHandlerOptions {
  connectionString: string;
  baseRoute: string;
}

/**
 * @private
 * Options for configuring the router
 */
export interface RouterOptions {
  /**
   * The base route for the router.
   */
  baseRoute: string;
  /**
   * Enable or disable OpenAPI schema generation.
   */
  openAPI: boolean;
  /**
   * A base schema for path parameters based on baseRoute.
   */
  basePathParamsSchema: z.ZodObject;

  /**
   * A wrapper function for the HTTP handler.
   * It adds request-specific context to the handler.
   */
  handlerWrapper: (handler: HttpHandler) => HttpHandler;
}

/** @private */
export type StorybooksRouterOpenAPIHandler = (
  options?: OpenAPIOptions
) => HttpHandler;

/** @private */
export type AzureFunctionsStorageBlobTriggerMetadata<
  Params extends string = string,
  Metadata extends Record<string, string> = Record<string, string>
> = {
  blobTrigger: string;
  uri: string;
  metadata: Metadata;
  properties: {
    metadata: Metadata;
    lastModified: string;
    createdOn: string;
    contentLength: number;
    contentType: string;
    eTag: unknown;
    contentHash: string | null;
    contentEncoding: string | null;
    contentDisposition: string | null;
    contentLanguage: string | null;
    cacheControl: string | null;
    blobSequenceNumber: number;
    acceptRanges: string;
    isServerEncrypted: boolean;
    accessTier: string;
    isVersionLatest: boolean;
    versionId: string | null;
    tagCount: number;
    expiresOn: string;
    lastAccessed: string;
    immutabilityPolicy: {
      expiresOn: string | null;
      policyMode: string | null;
    };
  };
} & Record<Params, string>;

export type StorybookProjectTableEntity = TableEntityResult<StorybookProject>;
export type StorybookBuildTableEntity = TableEntityResult<StorybookBuild>;
