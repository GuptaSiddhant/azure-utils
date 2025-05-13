import { app } from "@azure/functions";
import { checkServiceStatusHandler } from "./handlers/check-service-status";
import { getArtifactHandler } from "./handlers/get-artifact";
import { uploadArtifactHandler } from "./handlers/upload-artifact";
import { getAllArtifactsHandler } from "./handlers/get-all-artifacts";

app.setup({ enableHttpStream: true });

app.get("health-check", {
  route: "/",
  authLevel: "anonymous",
  handler: async () => ({
    body: `TurboRepo Remote Cache is up and running!`,
    status: 200,
  }),
});

app.post("get-all-artifacts", {
  route: "/v8/artifacts",
  handler: getAllArtifactsHandler,
});

app.get("check-service-status", {
  route: "/v8/artifacts/status",
  authLevel: "anonymous",
  handler: checkServiceStatusHandler,
});

app.http("check-artifact", {
  methods: ["HEAD"],
  route: "/v8/artifacts/{hash}",
  authLevel: "anonymous",
  handler: getArtifactHandler,
});

app.get("get-artifact", {
  route: "/v8/artifacts/{hash}",
  authLevel: "anonymous",
  handler: getArtifactHandler,
});

app.put("upload-artifact", {
  route: "/v8/artifacts/{hash}",
  authLevel: "anonymous",
  handler: uploadArtifactHandler,
});
