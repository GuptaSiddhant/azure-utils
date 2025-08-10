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
  labelStr: string,
  buildSHA: string
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
    return { slug, value, buildSHA };
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

type ListAzureTableEntitiesOptions<T extends Record<string, unknown>> = {
  limit?: number;
  filter?: string | ((item: T) => boolean);
  select?: string[];
  sort?: "latest" | ((a: T, b: T) => number);
};

export async function listAzureTableEntities<T extends Record<string, unknown>>(
  context: InvocationContext,
  tableClient: TableClient,
  queryOptions?: ListAzureTableEntitiesOptions<T>
): Promise<Array<TableEntityResult<T>>> {
  const { limit, filter, select, sort = "latest" } = queryOptions || {};
  try {
    await tableClient.createTable();
    const iterator = tableClient.listEntities<T>({
      queryOptions: {
        filter: typeof filter === "string" ? filter : undefined,
        select: select as string[],
      },
    });

    let entities: TableEntityResultPage<T> = [];
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

    if (typeof filter === "function") {
      entities = entities.filter(filter);
    }

    if (sort) {
      if (typeof sort === "function") {
        entities.sort(sort);
      } else {
        switch (sort) {
          case "latest":
            entities.sort((a, b) => {
              if (!a.timestamp || !b.timestamp) return 0;
              const aDate = new Date(a.timestamp);
              const bDate = new Date(b.timestamp);
              return bDate.getTime() - aDate.getTime();
            });
            break;
        }
      }
    }

    return entities;
  } catch (error) {
    context.error(
      `Error listing Azure Table '${tableClient.tableName}' entities:`,
      error
    );
    return [];
  }
}

export async function deleteAzureTableEntities<
  T extends Record<string, unknown>
>(
  context: InvocationContext,
  tableClient: TableClient,
  queryOptions?: ListAzureTableEntitiesOptions<T>
) {
  const entities = await listAzureTableEntities(
    context,
    tableClient,
    queryOptions
  );

  await Promise.allSettled(
    entities.map((entity) => {
      if (entity.partitionKey && entity.rowKey)
        return tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
      else return Promise.reject("Entity is missing partitionKey or rowKey");
    })
  );

  return;
}
