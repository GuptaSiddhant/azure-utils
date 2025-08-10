import {
  TableClient,
  TableEntityResult,
  TableEntityResultPage,
} from "@azure/data-tables";
import type {
  StorybookBuild,
  StorybookLabel,
  StorybookProject,
} from "./schemas";
import type { InvocationContext } from "@azure/functions";
import { PROJECTS_TABLE_PARTITION_KEY, SERVICE_NAME } from "./constants";

type TableSuffix = "Builds" | "Labels";

export function getAzureProjectsTableClient(
  connectionString: string
): TableClient {
  return TableClient.fromConnectionString(
    connectionString,
    `${SERVICE_NAME}Projects`
  );
}
export function getAzureTableClientForProject(
  connectionString: string,
  projectId: string,
  tableSuffix: TableSuffix
): TableClient {
  return TableClient.fromConnectionString(
    connectionString,
    `${SERVICE_NAME}${projectId
      .replace(/\W+/g, "")
      .toUpperCase()}${tableSuffix}`
  );
}

export async function upsertStorybookBuildToAzureTable(
  context: InvocationContext,
  connectionString: string,
  data: StorybookBuild
): Promise<void> {
  context.info(
    "Updating AzureTable with storybook build for",
    data.project,
    data.sha
  );
  const tableClient = getAzureTableClientForProject(
    connectionString,
    data.project,
    "Builds"
  );

  await tableClient.createTable();
  await tableClient.upsertEntity(
    {
      partitionKey: data.project,
      rowKey: data.sha,
      ...data,
    },
    "Merge"
  );
}

export async function upsertStorybookLabelsToAzureTable(
  context: InvocationContext,
  connectionString: string,
  projectId: string,
  labelStr: string
): Promise<string[]> {
  context.info(
    "Updating AzureTable with storybook labels for",
    projectId,
    labelStr
  );
  const tableClient = getAzureTableClientForProject(
    connectionString,
    projectId,
    "Labels"
  );
  await tableClient.createTable();

  const labels: StorybookLabel[] = labelStr.split(",").map((label) => {
    const value = label.trim();
    const slug = value.toLowerCase().replace(/\s+/g, "_").replace(/\W+/g, "-");
    return { slug, value };
  });

  await Promise.allSettled(
    labels.map((label) => {
      return tableClient.upsertEntity({
        partitionKey: projectId,
        rowKey: label.slug,
        project: projectId,
        ...label,
      });
    })
  );

  return labels.map((label) => label.slug);
}

export async function upsertStorybookProjectToAzureTable(
  context: InvocationContext,
  connectionString: string,
  data: StorybookProject,
  mode: "Merge" | "Replace" = "Replace"
): Promise<void> {
  context.info("Updating AzureTable with storybook project for", data.id);
  const tableClient = getAzureProjectsTableClient(connectionString);
  await tableClient.createTable();
  await tableClient.upsertEntity(
    {
      ...data,
      partitionKey: PROJECTS_TABLE_PARTITION_KEY,
      rowKey: data.id,
    },
    mode
  );
}

type ListAzureTableEntitiesOptions = {
  limit?: number;
  filter?: string;
  select?: string[];
};

export async function listAzureTableEntities(
  context: InvocationContext,
  tableName: string,
  connectionString: string,
  queryOptions?: ListAzureTableEntitiesOptions
): Promise<Array<TableEntityResult<Record<string, unknown>>>>;
export async function listAzureTableEntities(
  context: InvocationContext,
  table: TableClient,
  queryOptions?: ListAzureTableEntitiesOptions
): Promise<Array<TableEntityResult<Record<string, unknown>>>>;
export async function listAzureTableEntities(
  context: InvocationContext,
  table: TableClient | string,
  connectionStringOrOptions?: string | ListAzureTableEntitiesOptions,
  queryOptions?: ListAzureTableEntitiesOptions
): Promise<Array<TableEntityResult<Record<string, unknown>>>> {
  const { limit, filter, select } =
    (typeof connectionStringOrOptions === "object"
      ? connectionStringOrOptions
      : queryOptions) || {};
  try {
    const tableClient =
      table instanceof TableClient
        ? table
        : TableClient.fromConnectionString(
            connectionStringOrOptions as string,
            table
          );

    await tableClient.createTable();
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

    return entities;
  } catch (error) {
    context.error(
      `Error listing Azure Table '${
        table instanceof TableClient ? table.tableName : table
      }' entities:`,
      error
    );
    return [];
  }
}
