import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Readable } from "node:stream";
import { getOrCreateAzureStorageBlobContainerClientOrThrow } from "../utils/azure-storage-blob";
import { responseError } from "../utils/error-utils";
import { storybookMetadataSchema } from "../utils/schemas";
import type { StorybooksRouterHttpHandler } from "../utils/types";

export const uploadStorybookHandler: StorybooksRouterHttpHandler =
  (options) => async (request, context) => {
    const { connectionString, containerName } = options;

    try {
      const queryParseResult = storybookMetadataSchema.safeParse(
        Object.fromEntries(request.query.entries())
      );
      if (!queryParseResult.success) {
        return responseError(queryParseResult.error, context, 400);
      }
      const metadata = queryParseResult.data;

      const bodyValidationResponse = validateBody(request, context);
      if (typeof bodyValidationResponse === "object") {
        return bodyValidationResponse;
      }

      const containerClient =
        await getOrCreateAzureStorageBlobContainerClientOrThrow(
          context,
          connectionString,
          containerName
        );

      const blobName = `${metadata.project}/${metadata.commitSha}/storybook.zip`;
      context.debug(
        `Uploading stream to blob: ${blobName} (container: ${containerName})`
      );

      const uploadResponse = await containerClient
        .getBlockBlobClient(blobName)
        .uploadStream(Readable.fromWeb(request.body!), undefined, undefined, {
          blobHTTPHeaders: {
            blobContentType: "application/zip",
            blobContentEncoding: "utf8",
            blobCacheControl: "public, max-age=31536000",
          },
          metadata,
        });

      if (uploadResponse.errorCode) {
        return responseError(
          "Failed to upload Storybook.",
          context,
          uploadResponse._response.status
        );
      }

      return {
        status: 202,
        jsonBody: { success: true, metadata, blobName },
      };
    } catch (error) {
      return responseError(error, context);
    }
  };

function validateBody(
  request: HttpRequest,
  context: InvocationContext
): HttpResponseInit | undefined {
  const body = request.body;
  if (!body) {
    return responseError("Request body is required", context, 400);
  }
  const contentLength = request.headers.get("Content-Length");
  if (!contentLength) {
    return responseError("Content-Length header is required", context, 411);
  }
  if (parseInt(contentLength, 10) === 0) {
    return responseError("Request body should have length > 0", context, 400);
  }
  if (request.headers.get("content-type") !== "application/zip") {
    return responseError(
      "Invalid content type, expected application/zip",
      context,
      415
    );
  }

  return undefined;
}
