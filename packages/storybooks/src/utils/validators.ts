import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { responseError } from "./response-utils";

export function validateBuildUploadZipBody(
  request: HttpRequest
): HttpResponseInit | undefined {
  const body = request.body;
  if (!body) {
    return responseError("Request body is required", 400);
  }
  const contentLength = request.headers.get("Content-Length");
  if (!contentLength) {
    return responseError("Content-Length header is required", 411);
  }
  if (parseInt(contentLength, 10) === 0) {
    return responseError("Request body should have length > 0", 400);
  }

  return undefined;
}
