import type { HttpResponseInit } from "@azure/functions";
import type { ServeFnOptions } from "./types";
import { getAzureTableClient } from "./azure-data-tables";

export async function serveCommit(
  { context, options }: ServeFnOptions,
  project: string,
  commitSha: string
): Promise<HttpResponseInit> {
  context.log(`Serving commit '${commitSha}' for project '${project}'...`);

  const commit = await getAzureTableClient(options, "Commits").getEntity(
    project,
    commitSha
  );

  return { jsonBody: commit, status: 200 };
}
