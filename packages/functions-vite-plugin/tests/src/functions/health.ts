import { app } from "@azure/functions";

const handler = () => ({});

app.http("health-check", {
  methods: ["GET", "POST"],
  route: "/health",
  handler,
});

app.deleteRequest("test-delete", () => ({}));

app.timer("timer-check", {
  schedule: "* * * * *",
  handler,
});

app.storageBlob("storage-check", {
  handler,
  connection: "conn-str",
  path: "test-path",
});
