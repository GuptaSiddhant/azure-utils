/**
 * @module
 * Exports a class to create, register and manage a Durable Entity.
 *
 * > Note: This module is to be used inside Azure Functions app only.
 */

import type { InvocationContext } from "@azure/functions";
import * as df from "durable-functions";
import deepMerge from "deepmerge";

/**
 * DurableEntity is a wrapper around Durable Functions entities.
 *
 * It provides a simple way to define an entity with a default state and operations.
 * It also provides methods to get, reset, and update the state of the entity.
 * The entity is registered with the Durable framework when the class is instantiated.
 * The entity is identified by a name and a key.
 *
 * Note: keep Entity state small, limit to 16kB for reliable read operations.
 *
 * @example
 * ```ts
 * type MyEntityState = { foo: string; bar: number };
 * const defaultState: MyEntityState = { foo: "bar", bar: 0 };
 * const myEntity = new DurableEntity("my-entity", defaultState, {
 *   updateFoo: (input: { foo: string }) => ({ foo: input.foo }),
 *   updateBar: (input: { bar: number }) => ({ bar: input.bar }),
 * })
 * ```
 */
export class DurableEntity<
  State extends Record<string, unknown>,
  Operations extends NoInfer<
    Readonly<Record<string, (input: never) => DeepPartial<State>>>
  >
> {
  name: string;
  #defaultState: State;
  #operations: Operations;

  constructor(entityName: string, defaultState: State, operations: Operations) {
    this.name = entityName;
    this.#defaultState = defaultState;
    this.#operations = operations;

    // Register the entity with the Durable framework
    df.app.entity(entityName, (context: df.EntityContext<State>) => {
      const state: State = context.df.getState(() => this.#defaultState)!;
      const operationName = context.df.operationName;

      context.info(`[${context.functionName}] Operation: ${operationName}`);

      switch (operationName) {
        case "get":
          return context.df.return(state);
        case "reset":
          return context.df.setState(this.#defaultState);
        case "update": {
          const operationInput = context.df.getInput();
          const newState = deepMerge(state, operationInput ?? {}) as State;
          return context.df.setState(newState);
        }
        default: {
          context.error(
            `[${context.functionName}] Unknown operation: ${operationName}`
          );
          return;
        }
      }
    });
  }

  /**
   * Converts a string key to an EntityId.
   * If the key is already an EntityId, it returns it as is.
   */
  entityId(key: string | df.EntityId): df.EntityId {
    if (typeof key === "string") {
      return new df.EntityId(
        this.name,
        key.includes("@") ? this.getKey(key) : key
      );
    } else {
      return key;
    }
  }

  /**
   * Gets the durable task which yields the current state of the entity.
   *
   * Note: Can be only used in orchestrator functions.
   * The yielded value is not type-safe but can be safely casted to the Entity's state type.
   */
  getState(
    context: df.OrchestrationContext,
    keyOrEntityId: string | df.EntityId
  ): df.Task;
  /**
   * Gets the current state of the entity.
   * If the entity does not exists, it returns the default state.
   *
   * Note: Can be only used in client functions (HTTP triggers, etc.)
   */
  getState(
    context: InvocationContext,
    keyOrEntityId: string | df.EntityId
  ): Promise<State>;
  getState(
    context: df.OrchestrationContext | InvocationContext,
    keyOrEntityId: string | df.EntityId
  ): df.Task | Promise<State> {
    const client = getDfClientFromContext(context);
    const entityId = this.entityId(keyOrEntityId);

    if ("callEntity" in client) {
      return (client as unknown as df.DurableOrchestrationContext).callEntity(
        entityId,
        "get"
      );
    }

    return client
      .readEntityState<State>(entityId)
      .then((result) => result.entityState ?? this.#defaultState);
  }

  /**
   * Resets the state of the entity to the default state.
   */
  async resetState(
    context: InvocationContext | df.OrchestrationContext,
    keyOrEntityId: string | df.EntityId
  ): Promise<State> {
    const client = getDfClientFromContext(context);
    const entityId = this.entityId(keyOrEntityId);
    client.signalEntity(entityId, "reset");

    return this.#defaultState;
  }

  /**
   * Updates the state of the entity with the new state.
   * The new state is deeply-merged with the current state.
   */
  async updateState(
    context: InvocationContext | df.OrchestrationContext,
    keyOrEntityId: string | df.EntityId,
    newState: DeepPartial<State>
  ): Promise<void> {
    const client = getDfClientFromContext(context);
    const entityId = this.entityId(keyOrEntityId);
    client.signalEntity(entityId, "update", newState);
  }

  /**
   * Returns the key of the entity.
   * If the entityId is a string, it extracts the key from it.
   * If the entityId is an EntityId, it returns the key property.
   */
  getKey(entityId: string | df.EntityId): string {
    if (typeof entityId === "string") {
      return entityId.split("@").pop() ?? entityId;
    } else {
      return entityId.key;
    }
  }

  /**
   * Returns a map of operations that can be used to update the state of the entity.
   * The operations are defined in the constructor and are deeply-merged with the current state.
   */
  operations(
    context: InvocationContext | df.OrchestrationContext,
    keyOrEntityId: string | df.EntityId
  ): TransformedOperations<Operations> {
    const updateOperations: Record<string, (input: never) => Promise<void>> =
      {};

    Object.keys(this.#operations).forEach((operationName) => {
      context.debug("Update Entity state", {
        caller: context.functionName,
        entity: this.entityId(keyOrEntityId),
        operation: operationName,
      });
      updateOperations[operationName] = (input) =>
        this.updateState(
          context,
          keyOrEntityId,
          this.#operations[operationName]!(input)
        );
    });

    return updateOperations as TransformedOperations<Operations>;
  }

  /**
   * Lists all instances of the entity.
   */
  async listInstances(
    context: InvocationContext,
    filter?: df.OrchestrationFilter
  ): Promise<Array<DurableEntityStatus<State>>> {
    return await DurableEntity.listInstances<State>(context, this.name, filter);
  }

  static async listInstances<T = unknown>(
    context: InvocationContext,
    entityName?: string,
    filter?: df.OrchestrationFilter
  ): Promise<DurableEntityStatus<T>[]> {
    try {
      const client = getDfClientFromContext(context);
      const instances = await client.getStatusBy({
        ...filter,
        runtimeStatus: filter?.runtimeStatus ?? [
          df.OrchestrationRuntimeStatus.Running,
        ],
      });
      const filteredInstances = instances.filter((instance) =>
        instance.instanceId.startsWith(entityName ? `@${entityName}@` : "@")
      );

      return filteredInstances.map((instance) => {
        const input = instance.input as { state: T; exists: boolean };
        return {
          name: instance.name,
          instanceId: instance.instanceId,
          createdTime: instance.createdTime,
          lastUpdatedTime: instance.lastUpdatedTime,
          key: instance.instanceId.split("@").pop() ?? instance.instanceId,
          state:
            input.exists && input.state && typeof input.state === "string"
              ? JSON.parse(String(input.state))
              : null,
        };
      });
    } catch (error) {
      context.error("Error listing instances", { error, entityName, filter });
      return [];
    }
  }
}

/**
 * DurableEntityStatus is the status of a Durable Entity.
 */
export type DurableEntityStatus<State> = Pick<
  df.DurableOrchestrationStatus,
  "name" | "instanceId" | "createdTime" | "lastUpdatedTime"
> & { state: State | null; key: string };

/**
 * Helper function to get the Durable Functions client from the context.
 */
function getDfClientFromContext(
  context: df.OrchestrationContext
): df.DurableOrchestrationContext;
function getDfClientFromContext(context: InvocationContext): df.DurableClient;
function getDfClientFromContext(
  context: InvocationContext | df.OrchestrationContext
) {
  if ("df" in context) {
    return context.df;
  } else {
    return df.getClient(context);
  }
}

type TransformedOperations<
  T extends Readonly<Record<string, (input: never) => unknown>>
> = {
  [Prop in keyof T]: T[Prop] extends () => unknown
    ? () => Promise<void>
    : T[Prop] extends (input: infer I) => unknown
    ? (input: I) => Promise<void>
    : never;
};

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : Partial<T>;
