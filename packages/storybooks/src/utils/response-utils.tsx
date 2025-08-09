import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import { CONTENT_TYPES } from "./constants";
import { renderToStream } from "@kitajs/html/suspense";
import { parseErrorMessage } from "./error-utils";

export function responseHTML(html: JSX.Element): HttpResponseInit {
  return {
    status: 200,
    headers: { "Content-Type": CONTENT_TYPES.HTML },
    body: renderToStream(html),
  };
}

export function responseError(
  error: unknown,
  context: InvocationContext,
  init?: ResponseInit | number
): HttpResponseInit {
  const errorMessage = parseErrorMessage(error);
  context.error(errorMessage, error instanceof Error ? error.stack : undefined);

  const jsonBody = { errorMessage };
  const status = typeof init === "number" ? init : init?.status ?? 500;
  const headers = new Headers(typeof init === "number" ? {} : init?.headers);
  headers.set("Content-Type", "application/json");

  return { jsonBody, status, headers };
}
