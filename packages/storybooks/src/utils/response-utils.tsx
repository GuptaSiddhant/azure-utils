import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CONTENT_TYPES } from "./constants";
import { renderToStream } from "@kitajs/html/suspense";
import { parseErrorMessage } from "./error-utils";
import { DocumentLayout } from "../templates/components/layout";
import { getRequestStore } from "./stores";
import { joinUrl } from "./url-utils";

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
          <pre class="error-message raw-data">
            {errorMessage.includes("{")
              ? JSON.stringify(JSON.parse(errorMessage), null, 2)
              : errorMessage}
          </pre>
        </DocumentLayout>
      ),
    };
  }

  headers.set("Content-Type", "application/json");
  const jsonBody = { errorMessage };
  return { jsonBody, status, headers };
}
