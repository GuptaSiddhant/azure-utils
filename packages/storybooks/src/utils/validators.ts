import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { responseError } from "./response-utils";

export function validateBuildUploadBody(
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
