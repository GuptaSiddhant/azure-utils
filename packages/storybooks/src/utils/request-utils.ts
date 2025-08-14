import type { HttpRequest } from "@azure/functions";
import { getStore } from "./store";
import { CONTENT_TYPES } from "./constants";

export function checkIsHXRequest(request?: HttpRequest): boolean {
  const req = request || getStore().request;
  return req.headers.get("hx-request") === "true";
}

export function checkIsHTMLRequest(request?: HttpRequest): boolean {
  const req = request || getStore().request;
  const accept = req.headers.get("accept");
  return !!accept?.includes(CONTENT_TYPES.HTML);
}
