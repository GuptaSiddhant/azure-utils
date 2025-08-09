import type {
  HttpHandler,
  HttpRequest,
  HttpTriggerOptions,
  InvocationContext,
  StorageBlobHandler,
  TimerHandler,
} from "@azure/functions";
import type { TableEntityResult } from "@azure/data-tables";
import type { StorybookMetadata, StorybookProject } from "./schemas";
import z from "zod";

/**
 * Options to register the storybooks router
 */
export type RegisterStorybooksRouterOptions = {
  /**
   * Define the route on which all router is placed.
   *
   * @default 'storybooks/'
   */
  route?: string;

  /**
   * The function HTTP authorization level Defaults to 'anonymous' if not specified.
   */
  authLevel?: HttpTriggerOptions["authLevel"];

  /**
   * Azure Storage Blob Container name.
   * @default 'storybooks'
   */
  storageContainerName?: string;

  /**
   * Name of the Environment variable which stores
   * the connection string to the Azure Storage resource.
   * @default 'AzureWebJobsStorage'
   */
  storageConnectionStringEnvVar?: string;

  /**
   * Modify the cron-schedule of timer function
   * which purge outdated storybooks.
   *
   * Pass `null` to disable auto-purge functionality.
   *
   * @default "0 0 0 * * *" // Every midnight
   */
  purgeScheduleCron?: string | null;

  /**
   * Number of days after which storybooks are purged.
   * @default 30
   */
  purgeAfterDays?: number;

  /**
   * Options to configure OpenAPI schema
   */
  openapi?: {
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
  };
};

/**
 * @private
 * Options for linking with Azure Blob Storage
 */
export interface RouterHandlerOptions {
  /**
   * Azure Storage Blob Container name. @default `storybooks`.
   */
  containerName: string;

  /**
   * Azure Storage Connection String. Defaults to `env['AzureWebJobsStorage']`.
   */
  connectionString: string;

  /**
   * Number of days after which storybooks are purged.
   */
  purgeAfterDays: number;
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

  handlerOptions: RouterHandlerOptions;
}

/** @private */
export type StorybooksRouterHttpHandler = (
  options: RouterHandlerOptions
) => HttpHandler;

/** @private */
export type StorybooksRouterStorageBlobHandler = (
  handlerOptions: RouterHandlerOptions
) => StorageBlobHandler;

/** @private */
export type StorybooksRouterTimerHandler = (
  handlerOptions: RouterHandlerOptions
) => TimerHandler;

/** @private */
export type StorybooksRouterOpenAPIHandler = (
  handlerOptions: RegisterStorybooksRouterOptions["openapi"]
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

export type StorybookMetadataTableEntity = TableEntityResult<StorybookMetadata>;
export type StorybookProjectTableEntity = TableEntityResult<StorybookProject>;

export type ServeFnOptions = {
  context: InvocationContext;
  options: RouterHandlerOptions;
  request: HttpRequest;
};
