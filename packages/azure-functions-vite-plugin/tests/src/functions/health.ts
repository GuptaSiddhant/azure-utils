import { app } from "@azure/functions";

app.http("health-check", {
  methods: ["GET"],
  route: "/health",
  handler: () => ({ body: "Service is Healthy!", status: 200 }),
});
