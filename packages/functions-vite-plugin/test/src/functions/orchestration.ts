import { app } from "durable-functions";

app.orchestration("test-orch", function* () {});
app.activity("test-activity", { handler: () => {} });
app.entity("test-entity", () => {});

app.client.http("df-client", { handler: () => ({}) });
