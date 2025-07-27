import type { HttpResponseInit } from "@azure/functions";
import type { ServeFnOptions } from "./types";
import { listAzureTableEntities } from "./azure-data-tables";

export async function serveProjects({
  context,
  options,
}: ServeFnOptions): Promise<HttpResponseInit> {
  context.log("Serving all projects...");

  const projects = await listAzureTableEntities(context, options, {
    tableSuffix: "Projects",
  });

  return { jsonBody: projects, status: 200 };
}
