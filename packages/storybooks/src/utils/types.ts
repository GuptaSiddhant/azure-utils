import type {
  HttpHandler,
  HttpTriggerOptions,
  StorageBlobHandler,
} from "@azure/functions";
import type { TableEntityResult } from "@azure/data-tables";
import type { StorybookMetadata } from "./schemas";

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

export type StorybookTableEntity = TableEntityResult<StorybookMetadata>;
