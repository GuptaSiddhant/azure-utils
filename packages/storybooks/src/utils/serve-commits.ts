import type { HttpResponseInit } from "@azure/functions";
import type { ServeFnOptions } from "./types";
import { listAzureTableEntities, odata } from "./azure-data-tables";

export async function serveCommits(
  { context, options }: ServeFnOptions,
  project: string
): Promise<HttpResponseInit> {
  context.log(`Serving all commits for project '${project}'...`);

  const commits = await listAzureTableEntities(context, options, {
    tableSuffix: "Commits",
    filter: odata`project eq ${project}`,
  });

  return { jsonBody: commits, status: 200 };
}
