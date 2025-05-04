/**
 * @module
 * Helper utils to interact with Azure Functions Orchestrations.
 */

import {
  type RequestAzureFunctionsDurableTaskWebhookOptions,
  requestAzureFunctionsDurableTaskWebhookOrThrow,
} from "./durable-webhook.js";

// Start Azure Functions Orchestration

/**
 * Options for Starting an Azure Functions Orchestration.
 */
export type StartAzureFunctionsOrchestrationOptions = {
  /**
   * The name of the orchestrator function to start.
   */
  functionName: string;
  /**
   * Optional parameter. The ID of the orchestration instance.
   * If not specified, the orchestrator function will start with a random instance ID.
   */
  instanceId?: string;
  /**
   * Optional. The JSON-formatted orchestrator function input.
   */
  input: unknown;
};
export type StartAzureFunctionsOrchestrationResult = {
  /** The ID of the orchestration instance. */
  id: string;
  /** The status URL of the orchestration instance. */
  statusQueryGetUri: string;
  /** The "raise event" URL of the orchestration instance. */
  sendEventPostUri: string;
  /** The "terminate" URL of the orchestration instance. */
  terminatePostUri: string;
  /** The "purge history" URL of the orchestration instance. */
  purgeHistoryDeleteUri: string;
  /** (preview) The "rewind" URL of the orchestration instance. */
  rewindPostUri?: string;
  /** The "suspend" URL of the orchestration instance. */
  suspendPostUri: string;
  /** The "resume" URL of the orchestration instance. */
  resumePostUri: string;
};
/**
 * Starts executing a new instance of the specified orchestrator function.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#start-orchestration
 *
 * The HTTP response is intended to be compatible with the Polling Consumer Pattern. It also includes the following notable response headers:
 * Location (The URL of the status endpoint) and Retry-After (The number of seconds to wait before polling again).
 */
export async function startAzureFunctionsOrchestrationOrThrow(
  options: StartAzureFunctionsOrchestrationOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<{
  status: number;
  result: StartAzureFunctionsOrchestrationResult;
  headers: Headers;
}> {
  const { functionName, instanceId = "", input } = options;

  if (!functionName) {
    throw new Error("Orchestration function name is required.");
  }
  if (!input) {
    throw new Error("Orchestration input object is required.");
  }

  const response = await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `orchestrators/${functionName}/${instanceId}`,
    { ...requestOptions, body: JSON.stringify(input), method: "POST" }
  );

  return {
    result: (await response.json()) as StartAzureFunctionsOrchestrationResult,
    status: response.status,
    headers: response.headers,
  };
}

// List Azure Functions Orchestration Instances

/**
 * Options for listing Azure Functions Orchestration Instances.
 */
export type ListAzureFunctionsOrchestrationInstancesOptions = {
  /**
   * Optional parameter. When specified, filters the list of returned instances that were created at or after the given ISO8601 timestamp.
   */
  createdTimeFrom?: Date;
  /**
   * Optional parameter. When specified, filters the list of returned instances that were created at or before the given ISO8601 timestamp.
   */
  createdTimeTo?: Date;
  /**
   * Optional parameter. When specified, filters the list of returned instances based on their runtime status. To see the list of possible runtime status values, see the Querying instances article.
   */
  runtimeStatuses?: AzureFunctionsOrchestrationRuntimeStatus[];
  /**
   * Optional parameter. When specified, filters the list of returned instances to include only instances whose instance ID starts with the specified prefix string.
   */
  instanceIdPrefix?: string;
  /**
   * Optional parameter. If set to true, the function outputs will be included in the orchestration execution history.
   */
  showHistoryOutput?: boolean;
  /**
   * Optional parameter. If set to false, the function input will not be included in the response payload.
   * @default true
   */
  showInput?: boolean;

  /**
   * Optional parameter. When specified, limits the number of instances returned by the query.
   */
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
export type ListAzureFunctionsOrchestrationInstancesResult = {
  /**
   * The number of instances returned by the query.
   */
  top: number | null;
  /**
   * The continuation token for the next page of results.
   * This token is returned in the response headers of the previous page of results.
   */
  continuationToken: string | null;
  /**
   * The list of Azure Functions Orchestration Instances.
   */
  instances: AzureFunctionsOrchestrationInstance[];
};
/**
 * List Azure Functions Orchestration Instances. They can be filtered by
 * created time, runtime status, instance ID prefix, and other parameters.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#get-all-instances-status
 */
export async function listAzureFunctionsOrchestrationInstancesOrThrow(
  options: ListAzureFunctionsOrchestrationInstancesOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<ListAzureFunctionsOrchestrationInstancesResult> {
  const {
    createdTimeFrom,
    createdTimeTo,
    instanceIdPrefix,
    runtimeStatuses,
    showInput,
    showHistoryOutput,
    top,
    continuationToken,
  } = options;

  const searchParams = new URLSearchParams();
  if (createdTimeFrom) {
    searchParams.set("createdTimeFrom", createdTimeFrom.toISOString());
  }
  if (createdTimeTo) {
    searchParams.set("createdTimeTo", createdTimeTo.toISOString());
  }
  if (runtimeStatuses) {
    searchParams.set("runtimeStatus", runtimeStatuses.join(","));
  }
  if (instanceIdPrefix) {
    searchParams.set("instanceIdPrefix", instanceIdPrefix);
  }

  searchParams.set("showInput", showInput === false ? "false" : "true");
  searchParams.set(
    "showHistoryOutput",
    showHistoryOutput === true ? "true" : "false"
  );
  searchParams.set("showOutput", "false");

  if (top) {
    searchParams.set("top", top.toString());
  }

  const continuationTokenHeader = "x-ms-continuation-token";
  const headers = new Headers();
  if (continuationToken) {
    headers.set(continuationTokenHeader, continuationToken);
  }

  const response = await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances`,
    { ...requestOptions, searchParams, headers }
  );

  const instances =
    (await response.json()) as AzureFunctionsOrchestrationInstance[];

  return {
    instances,
    top: top ?? null,
    continuationToken: response.headers.get(continuationTokenHeader),
  };
}

/** Request options for Query Azure Functions Orchestration Instance by instanceId. */
export type GetAzureFunctionsOrchestrationInstanceOptions = {
  /**
   * The ID of the orchestration instance.
   */
  instanceId: string;
  /**
   * Optional parameter. If set to true,
   * the orchestration execution history will be included in the response payload.
   */
  showHistory?: boolean;
  /**
   * Optional parameter. If set to true,
   * the function outputs will be included in the orchestration execution history.
   */
  showHistoryOutput?: boolean;
  /**
   * Optional parameter. If set to false,
   * the function input will not be included in the response payload.
   * @default true
   */
  showInput?: boolean;
  /**
   * Optional parameter. If set to true, this API will return an HTTP 500
   * response instead of a 200 if the instance is in a failure state.
   * This parameter is intended for automated status polling scenarios.
   */
  returnInternalServerErrorOnFailure?: boolean;
};
/**
 * Gets the status of a specified orchestration instance.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#get-instance-status
 */
export async function getAzureFunctionsOrchestrationInstanceOrThrow(
  options: GetAzureFunctionsOrchestrationInstanceOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<{
  instance: AzureFunctionsOrchestrationInstance;
  status: number;
  headers: Headers;
}> {
  const {
    instanceId,
    showHistory,
    showHistoryOutput,
    showInput,
    returnInternalServerErrorOnFailure,
  } = options;

  if (!instanceId) {
    throw new Error("Orchestration task instanceId is required.");
  }

  const searchParams = new URLSearchParams();
  if (showHistory) {
    searchParams.set("showHistory", "true");
  }
  if (showHistoryOutput) {
    searchParams.set("showHistoryOutput", "true");
  }
  if (showInput === false) {
    searchParams.set("showInput", "false");
  }
  if (returnInternalServerErrorOnFailure) {
    searchParams.set("returnInternalServerErrorOnFailure", "true");
  }

  const response = await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances/${instanceId}`,
    { ...requestOptions, searchParams }
  );

  return {
    instance: (await response.json()) as AzureFunctionsOrchestrationInstance,
    status: response.status,
    headers: response.headers,
  };
}

// Purge Azure Functions Orchestration Instance

/**
 * Deletes the history and related artifacts for a specified orchestration instance.
 */
export async function purgeAzureFunctionsOrchestrationInstanceOrThrow(
  options: {
    /** The ID of the orchestration instance. */
    instanceId: string;
  },
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<boolean> {
  const response = await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances/${options.instanceId}`,
    { ...requestOptions, method: "DELETE" }
  );
  const data = (await response.json()) as { instancesDeleted: number };

  return data.instancesDeleted > 0;
}

// Purge Azure Functions Orchestration Instances

/**
 * Delete the history and related artifacts for multiple instances within a task hub
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#purge-multiple-instance-histories
 *
 * @returns The number of instances deleted.
 */
export async function purgeAzureFunctionsOrchestrationInstancesOrThrow(
  options: {
    /** Filters the list of purged instances that were created at or after the given ISO8601 timestamp. */
    createdTimeFrom: Date;
    /** Optional parameter. When specified, filters the list of purged instances that were created at or before the given ISO8601 timestamp. */
    createdTimeTo?: Date;
    /** Optional parameter. When specified, filters the list of purged instances based on their runtime status. */
    runtimeStatuses?: AzureFunctionsOrchestrationRuntimeStatus[];
  },
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<number> {
  const { createdTimeFrom, createdTimeTo, runtimeStatuses } = options;

  const searchParams = new URLSearchParams();
  searchParams.set("createdTimeFrom", createdTimeFrom.toISOString());
  if (createdTimeTo) {
    searchParams.set("createdTimeTo", createdTimeTo.toISOString());
  }
  if (runtimeStatuses) {
    searchParams.set("runtimeStatus", runtimeStatuses.join(","));
  }

  const response = await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances`,
    { ...requestOptions, method: "DELETE", searchParams }
  );

  const data = (await response.json()) as { instancesDeleted: number };

  return data.instancesDeleted;
}

// Azure Functions Orchestration Instance Events

/**
 * Sends an event notification message to a running orchestration instance.
 * Does not return a response.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#raise-event
 */
export async function raiseAzureFunctionsOrchestrationInstanceEventOrThrow(
  options: {
    /** The ID of the orchestration instance. */
    instanceId: string;
    /** The name of the event that the target orchestration instance is waiting on. */
    eventName: string;
    /** The JSON-formatted event payload. */
    eventBody?: object;
  },
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<void> {
  const { instanceId, eventName, eventBody = {} } = options;

  await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances/${instanceId}/raiseEvent/${eventName}`,
    { ...requestOptions, method: "POST", body: JSON.stringify(eventBody) }
  );

  return;
}

/**
 * Terminates a running orchestration instance.
 * Does not return a response.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#terminate-instance
 */
export async function terminateAzureFunctionsOrchestrationInstanceOrThrow(
  options: AzureFunctionsOrchestrationInstanceActionOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<void> {
  const { instanceId, reason } = options;

  await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances/${instanceId}/terminate`,
    { ...requestOptions, method: "POST", searchParams: { reason } }
  );

  return;
}

/**
 * Suspend/pause Azure Functions Orchestration Instance .
 * Does not return a response.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#suspend-instance
 */
export async function suspendAzureFunctionsOrchestrationInstanceOrThrow(
  options: AzureFunctionsOrchestrationInstanceActionOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<void> {
  const { instanceId, reason } = options;

  await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances/${instanceId}/suspend`,
    { ...requestOptions, method: "POST", searchParams: { reason } }
  );

  return;
}

/**
 * Resume Azure Functions Orchestration Instance.
 * Does not return a response.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#resume-instance
 */
export async function resumeAzureFunctionsOrchestrationInstanceOrThrow(
  options: AzureFunctionsOrchestrationInstanceActionOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<void> {
  const { instanceId, reason } = options;

  await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances/${instanceId}/resume`,
    { ...requestOptions, method: "POST", searchParams: { reason } }
  );

  return;
}

/**
 * Restores a failed orchestration instance into a running state by replaying the most recent failed operations.
 * Does not return a response.
 *
 * @see https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api#rewind-instance-preview
 */
export async function rewindAzureFunctionsOrchestrationInstanceOrThrow(
  options: AzureFunctionsOrchestrationInstanceActionOptions,
  requestOptions: RequestAzureFunctionsDurableTaskWebhookOptions
): Promise<void> {
  const { instanceId, reason } = options;

  await requestAzureFunctionsDurableTaskWebhookOrThrow(
    `instances/${instanceId}/resume`,
    { ...requestOptions, method: "POST", searchParams: { reason } }
  );

  return;
}

export type AzureFunctionsOrchestrationInstanceActionOptions = {
  /** The ID of the orchestration instance. */
  instanceId: string;
  /** The reason for performing action the orchestration instance. */
  reason: string;
};

/**
 * The Azure Functions Orchestration Instance.
 */
export type AzureFunctionsOrchestrationInstance<T = unknown> = {
  /**
   * The instance ID of the orchestration.
   */
  instanceId: string;
  /**
   * The name of the orchestration function.
   */
  name: string;
  /**
   * The current runtime status of the orchestration instance.
   */
  runtimeStatus: AzureFunctionsOrchestrationRuntimeStatus;
  /**
   * The input to the orchestration instance.
   * This is the input that was passed to the orchestrator function when it was started.
   */
  input: null | object;
  /**
   * The output of the orchestration instance.
   * This is the output that was returned by the orchestrator function when it completed.
   */
  output: T;
  /**
   * A field that can be used by orchestrator functions to store custom status information.
   */
  customStatus?: unknown;
  /**
   * ISO Timestamp of when the orchestration instance was created.
   */
  createdTime: string;
  /**
   * ISO Timestamp of when the orchestration instance was last updated.
   */
  lastUpdatedTime: string;
  /**
   * History events of the orchestration instance.
   * Only available if `showHistory` is set to true in the query.
   */
  historyEvents?: AzureFunctionsOrchestrationInstanceHistoryEvent[];
};

/**
 * The history events of an orchestration instance.
 */
export type AzureFunctionsOrchestrationInstanceHistoryEvent =
  | {
      EventType: "ExecutionStarted";
      Timestamp: string;
      FunctionName: string;
      Correlation?: null;
      ParentTraceContext?: null;
      ScheduledStartTime?: string | null;
      Generation?: number;
    }
  | {
      EventType: "TaskCompleted";
      Timestamp: string;
      FunctionName: string;
      Result?: unknown;
      ScheduledTime?: string | null;
    }
  | {
      EventType: "TaskFailed";
      Timestamp: string;
      FunctionName: string;
      Reason?: string;
      Details?: string | null;
      FailureDetails?: string | null;
      ScheduledTime?: string | null;
    }
  | {
      EventType: "ExecutionCompleted";
      Timestamp: string;
      FunctionName: string | undefined;
      OrchestrationStatus: AzureFunctionsOrchestrationRuntimeStatus;
      Result?: unknown;
      FailureDetails?: null | string;
    };

/**
 * The runtime status of an orchestration instance (type).
 */
export type AzureFunctionsOrchestrationRuntimeStatus = Values<
  typeof AzureFunctionsOrchestrationRuntimeStatuses
>;

/**
 * The runtime status of an orchestration instance.
 */
export const AzureFunctionsOrchestrationRuntimeStatuses = {
  /** The orchestration instance has started running.*/
  Running: "Running",
  /** The orchestration instance has completed normally.*/
  Completed: "Completed",
  /** The orchestration instance has restarted itself with a new history. This is a transient state.*/
  ContinuedAsNew: "ContinuedAsNew",
  /** The orchestration instance failed with an error.*/
  Failed: "Failed",
  /** The orchestration was canceled gracefully.*/
  Canceled: "Canceled",
  /** The orchestration instance was stopped abruptly.*/
  Terminated: "Terminated",
  /** The orchestration instance has been scheduled but has not yet started running.*/
  Pending: "Pending",
  /** The orchestration instance has been suspended and may be resumed to running later.*/
  Suspended: "Suspended",
} as const;

type Values<T> = T extends Record<string, unknown> ? T[keyof T] : never;
