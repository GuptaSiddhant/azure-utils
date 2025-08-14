import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import { renderToStream } from "@kitajs/html/suspense";
import { DocumentLayout } from "../components/layout";
import { ErrorMessage } from "../components/error-message";
import { CONTENT_TYPES } from "./constants";
import { parseErrorMessage } from "./error-utils";
import { getStore } from "./store";
import { checkIsHXRequest } from "./request-utils";

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
  context.error(errorMessage, error instanceof Error ? error.stack : "");

  const status =
    errorStatus ?? (typeof init === "number" ? init : init?.status ?? 500);
  const headers = new Headers(typeof init === "number" ? {} : init?.headers);

  const store = getStore(false);

  if (checkIsHXRequest()) {
    return { status, headers, body: errorMessage };
  }

  if (store?.accept?.includes(CONTENT_TYPES.HTML)) {
    headers.set("Content-Type", CONTENT_TYPES.HTML);

    return {
      status,
      headers,
      body: renderToStream(
        <DocumentLayout
          title={`Error ${status}`}
          breadcrumbs={[{ label: "< Back", href: "javascript:history.back()" }]}
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

export function responseRedirect(
  location: string,
  init: ResponseInit | number
): HttpResponseInit {
  const status = typeof init === "number" ? init : init?.status ?? 303;
  const headers = new Headers(typeof init === "number" ? {} : init?.headers);

  if (checkIsHXRequest()) {
    headers.set("HX-redirect", location);
  } else {
    headers.set("Location", location);
  }

  return { status, headers };
}
