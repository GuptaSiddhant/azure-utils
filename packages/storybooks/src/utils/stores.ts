import { AsyncLocalStorage } from "node:async_hooks";
import type { HttpRequest } from "@azure/functions";
import { RouterHandlerOptions } from "./types";

export type RequestStore = {
  accept: string | null;
  locale: string | undefined;
  url: string;
  connectionString: string;
};

export const requestStore = new AsyncLocalStorage<RequestStore>();

export function getRequestStore(throwError: false): RequestStore | undefined;
export function getRequestStore(throwError?: true): RequestStore;
export function getRequestStore(throwError?: boolean) {
  const store = requestStore.getStore();
  if (!store && throwError !== false) {
    throw new Error("Request store not found.");
  }

  return store;
}

export function generateRequestStore(
  request: HttpRequest,
  options: RouterHandlerOptions
): RequestStore {
  const locale =
    request.headers.get("accept-language")?.split(",")[0] || options.locale;
  const accept = request.headers.get("accept");

  return {
    accept,
    locale,
    url: request.url,
    connectionString: options.connectionString,
  };
}
