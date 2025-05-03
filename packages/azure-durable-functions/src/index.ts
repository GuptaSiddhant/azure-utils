/**
 * @module
 * Helper utils to interact with Azure Functions - Durable Task framework (v2).
 * The module exports type-safe functions for HTTP Api listed on
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api
 *
 * > The Durable Functions extension exposes a set of built-in HTTP APIs
 * > that can be used to perform management tasks on orchestrations, entities,
 * > and task hubs. These HTTP APIs are extensibility webhooks that are authorized
 * > by the Azure Functions host but handled directly by the Durable Functions extension.
 */

export type { RequestAzureFunctionsDurableTaskWebhookOptions } from "./durable-webhook";

import * as orchestrationApi from "./durable-orchestrations-api";
import * as entitiesApi from "./durable-entities-api";

/**
 * An object that contains all the functions for interacting with Azure Functions Durable Orchestrations.
 *
 * @throws Each method can throw an error if the operation fails.
 */
export const durableOrchestrations = {
  start: orchestrationApi.startAzureFunctionsOrchestrationOrThrow,
  list: orchestrationApi.listAzureFunctionsOrchestrationInstancesOrThrow,
  get: orchestrationApi.getAzureFunctionsOrchestrationInstanceOrThrow,
  purge: orchestrationApi.purgeAzureFunctionsOrchestrationInstanceOrThrow,
  purgeAll: orchestrationApi.purgeAzureFunctionsOrchestrationInstancesOrThrow,
  raiseEvent:
    orchestrationApi.raiseAzureFunctionsOrchestrationInstanceEventOrThrow,
  terminate:
    orchestrationApi.terminateAzureFunctionsOrchestrationInstanceOrThrow,
  suspend: orchestrationApi.suspendAzureFunctionsOrchestrationInstanceOrThrow,
  resume: orchestrationApi.resumeAzureFunctionsOrchestrationInstanceOrThrow,
  rewind: orchestrationApi.rewindAzureFunctionsOrchestrationInstanceOrThrow,
};

export { AzureFunctionsOrchestrationRuntimeStatuses } from "./durable-orchestrations-api";
export type {
  AzureFunctionsOrchestrationInstance,
  AzureFunctionsOrchestrationInstanceHistoryEvent,
  AzureFunctionsOrchestrationRuntimeStatus,
  GetAzureFunctionsOrchestrationInstanceOptions,
  ListAzureFunctionsOrchestrationInstancesOptions,
  ListAzureFunctionsOrchestrationInstancesResult,
  StartAzureFunctionsOrchestrationOptions,
  StartAzureFunctionsOrchestrationResult,
  AzureFunctionsOrchestrationInstanceActionOptions,
} from "./durable-orchestrations-api";

/**
 * An object that contains all the functions for interacting with Azure Functions Durable Entity.
 *
 * @throws Each method can throw an error if the operation fails.
 */
export const durableEntities = {
  list: entitiesApi.listAzureFunctionsEntitiesOrThrow,
  getState: entitiesApi.getAzureFunctionsEntityStateOrThrow,
  signal: entitiesApi.signalAzureFunctionsEntityOrThrow,
};

export type {
  AzureFunctionsEntityInstance,
  GetAzureFunctionsEntityOptions,
  ListAzureFunctionsEntitiesOptions,
  ListAzureFunctionsEntitiesResult,
  SignalAzureFunctionsEntityOptions,
} from "./durable-entities-api";
