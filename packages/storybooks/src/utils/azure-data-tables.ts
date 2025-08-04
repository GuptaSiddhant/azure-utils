import { TableClient, TableEntityResultPage } from "@azure/data-tables";
import type {
  RouterHandlerOptions,
  StorybookMetadataTableEntity,
  StorybookProjectTableEntity,
} from "./types";
import type { StorybookMetadata, StorybookProject } from "./schemas";
import type { InvocationContext } from "@azure/functions";

type TableSuffix = "Projects" | "Commits";

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
  data: StorybookProject,
  userId = "default"
): Promise<void> {
  context.info("Updating AzureTable with storybook project for", data.id);
  const tableClient = getAzureTableClient(options, "Projects");

  await tableClient.createTable();
  await tableClient.upsertEntity(
    {
      ...data,
      partitionKey: userId,
      rowKey: data.id,
    },
    "Replace"
  );
}

export async function listAzureTableEntities<
  Suffix extends TableSuffix,
  TableEntity = Suffix extends "Projects"
    ? StorybookProjectTableEntity
    : Suffix extends "Commits"
    ? StorybookMetadataTableEntity
    : never
>(
  context: InvocationContext,
  options: RouterHandlerOptions,
  tableSuffix: Suffix,
  queryOptions?: {
    limit?: number;
    filter?: string;
    select?: (keyof NoInfer<TableEntity>)[];
  }
): Promise<Array<TableEntity>> {
  const { limit, filter, select } = queryOptions || {};
  try {
    const tableClient = getAzureTableClient(options, tableSuffix);
    const iterator = tableClient.listEntities({
      queryOptions: { filter, select: select as string[] },
    });

    let entities: TableEntityResultPage<Record<string, unknown>> = [];
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

    return entities as TableEntity[];
  } catch (error) {
    context.error("Error listing Azure Table entities:", error);
    return [];
  }
}
