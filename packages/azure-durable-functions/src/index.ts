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

export type { RequestAzureFunctionsDurableTaskWebhookOptions } from "./durable-webhook.js";

import {
  getAzureFunctionsOrchestrationInstanceOrThrow,
  listAzureFunctionsOrchestrationInstancesOrThrow,
  purgeAzureFunctionsOrchestrationInstanceOrThrow,
  purgeAzureFunctionsOrchestrationInstancesOrThrow,
  startAzureFunctionsOrchestrationOrThrow,
  raiseAzureFunctionsOrchestrationInstanceEventOrThrow,
  terminateAzureFunctionsOrchestrationInstanceOrThrow,
  resumeAzureFunctionsOrchestrationInstanceOrThrow,
  suspendAzureFunctionsOrchestrationInstanceOrThrow,
  rewindAzureFunctionsOrchestrationInstanceOrThrow,
} from "./durable-orchestrations-api.js";
import {
  listAzureFunctionsEntitiesOrThrow,
  getAzureFunctionsEntityStateOrThrow,
  signalAzureFunctionsEntityOrThrow,
} from "./durable-entities-api.js";

/**
 * An object that contains all the functions for interacting with Azure Functions Durable Orchestrations.
 *
 * @throws Each method can throw an error if the operation fails.
 */
export const durableOrchestrations = {
  /** Starts executing a new instance of the specified orchestrator function. */
  start: startAzureFunctionsOrchestrationOrThrow,
  /** List Azure Functions Orchestration Instances.  */
  list: listAzureFunctionsOrchestrationInstancesOrThrow,
  /** Gets the status of a specified orchestration instance. */
  get: getAzureFunctionsOrchestrationInstanceOrThrow,
  /** Deletes the history and related artifacts for a specified orchestration instance. */
  purge: purgeAzureFunctionsOrchestrationInstanceOrThrow,
  /** Delete the history and related artifacts for multiple instances within a task hub. */
  purgeAll: purgeAzureFunctionsOrchestrationInstancesOrThrow,
  /** ends an event notification message to a running orchestration instance. */
  raiseEvent: raiseAzureFunctionsOrchestrationInstanceEventOrThrow,
  /** Terminates a running orchestration instance. */
  terminate: terminateAzureFunctionsOrchestrationInstanceOrThrow,
  /** Suspend/pause Azure Functions Orchestration Instance . */
  suspend: suspendAzureFunctionsOrchestrationInstanceOrThrow,
  /** Resume Azure Functions Orchestration Instance. */
  resume: resumeAzureFunctionsOrchestrationInstanceOrThrow,
  /** Restores a failed orchestration instance into a running state by replaying the most recent failed operations. */
  rewind: rewindAzureFunctionsOrchestrationInstanceOrThrow,
};

export { AzureFunctionsOrchestrationRuntimeStatuses } from "./durable-orchestrations-api.js";
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
} from "./durable-orchestrations-api.js";

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

export type {
  AzureFunctionsEntityInstance,
  GetAzureFunctionsEntityOptions,
  ListAzureFunctionsEntitiesOptions,
  ListAzureFunctionsEntitiesResult,
  SignalAzureFunctionsEntityOptions,
} from "./durable-entities-api.js";
