import type { HttpHandler } from "@azure/functions";

/**
 * Options for linking with Azure Blob Storage
 */
export interface AzureBlobStorageOptions {
  /**
   * Azure Storage Blob Container name. Defaults to `env['CONTAINER_NAME']` or `turborepocache`.
   */
  containerName: string;
  /**
   * Azure Storage Connection String. Defaults to `env['AzureWebJobsStorage']`.
   */
  connectionString: string;
}

/**
 * Options for registering cache router
 */
export type RegisterCacheRouterOptions = Partial<AzureBlobStorageOptions> & {
  /**
   * Token used for authentication. Defaults to `env['TURBO_TOKEN']`.
   */
  turboToken?: string;

  /**
   * Add health-check endpoint which is unauthenticated and publicly accessible.
   *
   * It is enabled by default at the root path (`/`).
   *
   * Set to false to disable it or provide a string to change the route-path.
   */
  healthCheck?: boolean | string;
};

export type CacheRouterHttpHandler = (
  options: RegisterCacheRouterOptions
) => HttpHandler;
