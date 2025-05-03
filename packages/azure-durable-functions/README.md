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
