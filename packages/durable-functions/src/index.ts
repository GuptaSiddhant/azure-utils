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

export {
  durableOrchestrations,
  AzureFunctionsOrchestrationRuntimeStatuses,
} from "./durable-orchestrations-api.js";
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

export { durableEntities } from "./durable-entities-api.js";
export type {
  AzureFunctionsEntityInstance,
  GetAzureFunctionsEntityOptions,
  ListAzureFunctionsEntitiesOptions,
  ListAzureFunctionsEntitiesResult,
  SignalAzureFunctionsEntityOptions,
} from "./durable-entities-api.js";
