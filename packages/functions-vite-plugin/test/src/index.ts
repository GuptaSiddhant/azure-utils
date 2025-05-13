import { app, InvocationContext } from "@azure/functions";

app.setup({ enableHttpStream: true });

console.log("Logging from functions app");

export class DummyOrchestrationContext extends InvocationContext {
  constructor(functionName = "dummyContextFunctionName") {
    const invocationContextInit = {
      functionName,
    };
    super(invocationContextInit);
  }
}

throw new Error("test");
