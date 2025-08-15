import {
  TableClient,
  TableEntityResult,
  TableEntityResultPage,
} from "@azure/data-tables";
import { DEFAULT_SERVICE_NAME } from "./constants";
import { getStore } from "./store";

type TableSuffix = "Builds" | "Labels";

export function generateProjectAzureTableName(
  projectId: string,
  tableSuffix: TableSuffix
): string {
  return `${DEFAULT_SERVICE_NAME}${projectId
    .replace(/\W+/g, "")
    .toUpperCase()}${tableSuffix}`;
}

export type ListAzureTableEntitiesOptions<T extends Record<string, unknown>> = {
  limit?: number;
  filter?: string | ((item: T) => boolean);
  select?: string[];
  sort?: "latest" | ((a: T, b: T) => number);
};

export async function listAzureTableEntities<T extends Record<string, unknown>>(
  tableClient: TableClient,
  queryOptions?: ListAzureTableEntitiesOptions<T>
): Promise<Array<TableEntityResult<T>>> {
  const { context } = getStore();
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
