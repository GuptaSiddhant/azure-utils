import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import { CONTENT_TYPES } from "./constants";
import { renderToStream } from "@kitajs/html/suspense";
import { parseErrorMessage } from "./error-utils";
import { DocumentLayout } from "../components/layout";
import { getRequestStore } from "./stores";
import { joinUrl } from "./url-utils";
import { ErrorMessage } from "../components/error-message";

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
  const { errorMessage, errorStatus } = parseErrorMessage(error);
  context.error(errorMessage, error instanceof Error ? error.stack : undefined);

  const status =
    errorStatus ?? (typeof init === "number" ? init : init?.status ?? 500);
  const headers = new Headers(typeof init === "number" ? {} : init?.headers);

  const store = getRequestStore(false);
  if (store?.accept?.includes(CONTENT_TYPES.HTML)) {
    headers.set("Content-Type", CONTENT_TYPES.HTML);

    return {
      status,
      headers,
      body: renderToStream(
        <DocumentLayout
          title={`Error ${status}`}
          breadcrumbs={[{ label: "< Back", href: joinUrl(store.url, "..") }]}
        >
          <ErrorMessage>{errorMessage}</ErrorMessage>
        </DocumentLayout>
      ),
    };
  }

  headers.set("Content-Type", "application/json");
  const jsonBody = { errorMessage };
  return { jsonBody, status, headers };
}
