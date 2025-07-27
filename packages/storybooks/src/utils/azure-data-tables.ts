import { TableClient, odata } from "@azure/data-tables";
import type { RouterHandlerOptions, StorybookTableEntity } from "./types";
import type { StorybookMetadata } from "./schemas";
import type { InvocationContext } from "@azure/functions";

type TableSuffix = "Projects" | "Commits";

export { odata };

export function getAzureTableClient(
  options: RouterHandlerOptions,
  tableSuffix: TableSuffix
): TableClient {
  return TableClient.fromConnectionString(
    options.connectionString,
    `${options.containerName}${tableSuffix}`
  );
}

export async function upsertStorybookMetadataToAzureTable(
  options: RouterHandlerOptions,
  context: InvocationContext,
  metadata: StorybookMetadata
): Promise<void> {
  context.info(
    "Updating AzureTable with storybook metadata for",
    metadata.project,
    metadata.commitSha
  );
  const tableClient = getAzureTableClient(options, "Commits");

  await tableClient.createTable();
  await tableClient.upsertEntity(
    {
      partitionKey: metadata.project,
      rowKey: metadata.commitSha,
      ...metadata,
    },
    "Merge"
  );
}

export async function upsertStorybookProjectToAzureTable(
  options: RouterHandlerOptions,
  context: InvocationContext,
  metadata: StorybookMetadata
): Promise<void> {
  context.info(
    "Updating AzureTable with storybook project for",
    metadata.project
  );
  const tableClient = getAzureTableClient(options, "Projects");

  await tableClient.createTable();
  await tableClient.upsertEntity(
    {
      partitionKey: "projects",
      rowKey: metadata.project,
      ...metadata,
    },
    "Replace"
  );
}

export async function listAzureTableEntities(
  context: InvocationContext,
  options: RouterHandlerOptions,
  queryOptions: {
    tableSuffix: TableSuffix;
    limit?: number;
    filter?: string;
    select?: (keyof StorybookTableEntity)[];
  }
): Promise<StorybookTableEntity[]> {
  const { limit, filter, select, tableSuffix } = queryOptions;
  try {
    const tableClient = getAzureTableClient(options, tableSuffix);
    const iterator = tableClient.listEntities<StorybookTableEntity>({
      queryOptions: { filter, select },
    });

    let entities: StorybookTableEntity[] = [];
    if (limit) {
      for await (const page of iterator.byPage({ maxPageSize: limit })) {
        entities = page; // Take the first page as the entities result
        break;
      }
    } else {
      for await (const page of iterator.byPage()) {
        entities.push(...page);
      }
    }

    return entities;
  } catch (error) {
    context.error("Error listing Azure Table entities:", error);
    return [];
  }
}
