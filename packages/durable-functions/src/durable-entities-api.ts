/**
 * @module
 * Helper utils to interact with Azure Functions Entities.
 */

import {
  type RequestAzureFunctionsDurableTaskWebhookOptions,
  requestAzureFunctionsDurableTaskWebhookOrThrow,
} from "./durable-webhook.js";

/**
 * An object that contains all the functions for interacting with Azure Functions Durable Entity.
 *
 * @throws Each method can throw an error if the operation fails.
 */
export const durableEntities = {
  /** Query and list Azure Functions Entity Instances. */
  list: listAzureFunctionsEntitiesOrThrow,
  /** Gets the state of the specified entity. */
  getState: getAzureFunctionsEntityStateOrThrow,
  /** Sends a one-way operation message to a Durable Entity. */
  signal: signalAzureFunctionsEntityOrThrow,
};

/**
 * Options for the `signalAzureFunctionsEntityOrThrow` function.
 */
export type SignalAzureFunctionsEntityOptions = {
  /** The name (type) of the entity. */
  entityName: string;
  /** The key (unique ID) of the entity. */
  entityKey: string;
  /** Optional. The name of the user-defined operation to invoke. */
  operationName?: string;
  /** The JSON-formatted event payload. */
  operationInput?: unknown;
};
/**
 * Sends a one-way operation message to a Durable Entity. If the entity doesn't exist, it will be created automatically.
 */
export async function signalAzureFunctionsEntityOrThrow(
  options: SignalAzureFunctionsEntityOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<void> {
  const { entityKey, entityName, operationInput, operationName } = options;

  const searchParams = new URLSearchParams();
  if (operationName) {
    searchParams.set("op", operationName);
  }

  await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `entities/${entityName}/${entityKey}`,
    {
      ...requestOptions,
      searchParams,
      body: JSON.stringify(operationInput),
      method: "POST",
    }
  );

  return;
}

/**
 * Options for the `getAzureFunctionsEntityOrThrow` function.
 */
export type GetAzureFunctionsEntityOptions = {
  /** The name (type) of the entity. */
  entityName: string;
  /** The key (unique ID) of the entity. */
  entityKey: string;
};

/**
 * Gets the state of the specified entity.
 */
export async function getAzureFunctionsEntityStateOrThrow<T = unknown>(
  options: GetAzureFunctionsEntityOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<T> {
  const { entityKey, entityName } = options;

  const response = await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `entities/${entityName}/${entityKey}`,
    requestOptions
  );

  return response.json() as T;
}

/**
 * Options for the `listAzureFunctionsEntitiesOrThrow` function.
 */
export type ListAzureFunctionsEntitiesOptions = {
  /** Optional. When specified, filters the list of returned entities by their entity name (case-insensitive). */
  entityName?: string;
  /** Optional parameter. If set to true, the entity state will be included in the response payload. */
  fetchState?: boolean;
  /** Optional parameter. When specified, filters the list of returned entities that processed operations after the given ISO8601 timestamp. */
  lastOperationTimeFrom?: Date;
  /** Optional parameter. When specified, filters the list of returned entities that processed operations before the given ISO8601 timestamp. */
  lastOperationTimeTo?: Date;
  /** Optional parameter. When specified, limits the number of entities returned by the query. */
  top?: number;
  /**
   * Optional parameter. When specified, the continuation token for the next page of results.
   * This token is returned in the response headers of the previous page of results.
   */
  continuationToken?: string;
};

/**
 * The result of listing Azure Functions Orchestration Instances.
 */
export type ListAzureFunctionsEntitiesResult<T> = {
  /** The number of instances returned by the query. */
  top: number | null;
  /**
   * The continuation token for the next page of results.
   * This token is returned in the response headers of the previous page of results.
   */
  continuationToken: string | null;
  /** The list of Azure Functions Entity Instances.*/
  instances: AzureFunctionsEntityInstance<T>[];
};
/**
 * Query and list Azure Functions Entity Instances.
 */
export async function listAzureFunctionsEntitiesOrThrow<T = unknown>(
  options: ListAzureFunctionsEntitiesOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<ListAzureFunctionsEntitiesResult<T>> {
  const {
    entityName = "",
    fetchState,
    lastOperationTimeFrom,
    lastOperationTimeTo,
    top,
    continuationToken,
  } = options;

  const searchParams = new URLSearchParams();
  if (fetchState) {
    searchParams.set("fetchState", "true");
  }
  if (lastOperationTimeFrom) {
    searchParams.set(
      "lastOperationTimeFrom",
      lastOperationTimeFrom.toISOString()
    );
  }
  if (lastOperationTimeTo) {
    searchParams.set("lastOperationTimeTo", lastOperationTimeTo.toISOString());
  }
  if (top) {
    searchParams.set("top", top.toString());
  }

  const continuationTokenHeader = "x-ms-continuation-token";
  const headers = new Headers();
  if (continuationToken) {
    headers.set(continuationTokenHeader, continuationToken);
  }

  const response = await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `entities/${entityName}`,
    { ...requestOptions, searchParams, headers }
  );

  const instances =
    (await response.json()) as AzureFunctionsEntityInstance<T>[];

  return {
    instances,
    top: top ?? null,
    continuationToken: response.headers.get(continuationTokenHeader),
  };
}

/**
 * The Azure Functions Entity Instance.
 */
export type AzureFunctionsEntityInstance<T = unknown> = {
  entityId: { name: string; key: string };
  lastOperationTime: string;
  state?: T;
};
