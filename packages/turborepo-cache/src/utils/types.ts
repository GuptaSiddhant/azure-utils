import type { HttpHandler } from "@azure/functions";

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
};

export type CacheRouterHttpHandler = (
  options: RegisterCacheRouterOptions
) => HttpHandler;
