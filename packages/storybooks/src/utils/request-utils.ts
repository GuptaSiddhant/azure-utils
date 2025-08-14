import type { HttpRequest } from "@azure/functions";
import { getStore } from "./store";
import { CONTENT_TYPES, QUERY_PARAMS } from "./constants";

export function checkIsHXRequest(request?: HttpRequest): boolean {
  const req = request || getStore().request;
  return req.headers.get("hx-request") === "true";
}

export function checkIsHTMLRequest(request?: HttpRequest): boolean {
  const req = request || getStore().request;
  const accept = req.headers.get("accept");
  return !!accept?.includes(CONTENT_TYPES.HTML);
}

export function checkIsNewMode(request?: HttpRequest): boolean {
  const req = request || getStore().request;
  return req.query.get(QUERY_PARAMS.mode) === QUERY_PARAMS.newResource;
}

export function checkIsEditMode(request?: HttpRequest): boolean {
  const req = request || getStore().request;
  return req.query.get(QUERY_PARAMS.mode) === QUERY_PARAMS.editResource;
}
