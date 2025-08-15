import type { HttpResponseInit } from "@azure/functions";
import { renderToStream } from "@kitajs/html/suspense";
import { DocumentLayout } from "../components/layout";
import { ErrorMessage } from "../components/error-message";
import { CONTENT_TYPES } from "./constants";
import { parseErrorMessage } from "./error-utils";
import { checkIsHTMLRequest, checkIsHXRequest } from "./request-utils";
import { createElement } from "@kitajs/html";
import { getStore } from "./store";

export function responseHTML(html: JSX.Element): HttpResponseInit {
  return {
    status: 200,
    headers: { "Content-Type": CONTENT_TYPES.HTML },
    body: renderToStream(html),
  };
}

export function responseError(
  error: unknown,
  init?: ResponseInit | number
): HttpResponseInit {
  const { context } = getStore();

  try {
    const { errorMessage, errorStatus, errorType } = parseErrorMessage(error);
    context.error(
      `[${errorType}]`,
      errorMessage,
      error instanceof Error ? error.stack : ""
    );

    const status =
      errorStatus ?? (typeof init === "number" ? init : init?.status ?? 500);
    const headers = new Headers(typeof init === "number" ? {} : init?.headers);

    if (checkIsHXRequest()) {
      try {
        headers.set("HXToaster-Type", "error");
        headers.set("HXToaster-Body", errorMessage);
      } catch {}
      return { status, headers, body: errorMessage };
    }

    if (checkIsHTMLRequest()) {
      headers.set("Content-Type", CONTENT_TYPES.HTML);

      return {
        status,
        headers,
        body: renderToStream(
          createElement(
            DocumentLayout,
            {
              title: `Error ${status}`,
              breadcrumbs: [
                { label: "< Back", href: "javascript:history.back()" },
              ],
            },
            createElement(ErrorMessage, {}, errorMessage)
          )
        ),
      };
    }

    headers.set("Content-Type", "application/json");
    const jsonBody = { errorMessage };
    return { jsonBody, status, headers };
  } catch (err) {
    context.error(`[ErrOnErr]`, err);
    return {
      status: 500,
      body: typeof err === "string" ? err : undefined,
      jsonBody: typeof err === "string" ? undefined : err,
    };
  }
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
