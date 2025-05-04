# Azure Durable Functions

This package provides a set of tools for working with Azure Durable Functions in TypeScript. It includes functions for interacting with Durable Functions through HTTP API.

## Orchestrations API

Example

```ts
import { durableOrchestrations } from "@azure-utils/durable-functions";

try {
  const response = await durableOrchestrations.start(
    {
      functionName: "myOrchestratorName",
      input: { key: "value" },
    },
    {
      baseUrl: "http://localhost:7071",
      systemKey: "",
    }
  );

  const id = response.result.id;
  console.log(`Orchestration started with ID: ${id}`);
} catch (error) {
  console.error(error);
}
```

## Entities API

Example

```ts
import { durableEntities } from "@azure-utils/durable-functions";

type State = { foo: string; bar: number };

try {
  const state = await durableEntities.getState<State>(
    {
      entityName: "myOrchestratorName",
      entityKey: "value",
    },
    {
      baseUrl: "http://localhost:7071",
      systemKey: "",
    }
  );

  console.log(`State: ${state}`);
} catch (error) {
  console.error(error);
}
```

## `DurableEntity` class

This class is used to define a Durable Entity with a specific state and methods. It provides a way to manage the state of the entity and define actions that can be performed on it.

> This must be used in the Azure Functions app.

```ts
import { DurableEntity } from "@azure-utils/durable-functions/entity";

type MyEntityState = { foo: string; bar: number };
const defaultState: MyEntityState = { foo: "bar", bar: 0 };

export const myEntity = new DurableEntity("my-entity", defaultState, {
  updateFoo: (input: { foo: string }) => ({ foo: input.foo }),
  updateBar: (input: { bar: number }) => ({ bar: input.bar }),
});
```
