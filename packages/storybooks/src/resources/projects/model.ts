import { TableClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";
import { DEFAULT_GITHUB_BRANCH, DEFAULT_SERVICE_NAME } from "#utils/constants";
import {
  generateProjectAzureTableName,
  listAzureTableEntities,
  ListAzureTableEntitiesOptions,
} from "#utils/azure-data-tables";
import { generateAzureStorageContainerName } from "#utils/azure-storage-blob";
import {
  ProjectCreateSchema,
  ProjectSchema,
  ProjectType,
  ProjectUpdateSchema,
} from "./schema";
import { BaseIdModel, BaseModel } from "#utils/shared-model";
import { getStore } from "#utils/store";
import { LabelsModel } from "#labels/model";

const partitionKey = "projects";

export class ProjectsModel implements BaseModel<ProjectType> {
  #tableClient: TableClient;

  constructor() {
    const { connectionString } = getStore();
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      DEFAULT_SERVICE_NAME
    );
  }

  id(id: string) {
    return new ProjectIdModel(id);
  }

  #log(...args: unknown[]) {
    getStore().context.log(...args);
  }

  async list(
    options?: ListAzureTableEntitiesOptions<ProjectType>
  ): Promise<ProjectType[]> {
    this.#log("List projects...");
    const entities = await listAzureTableEntities(this.#tableClient, options);

    return ProjectSchema.array().parse(entities);
  }

  async create(data: unknown): Promise<ProjectType> {
    const { connectionString } = getStore();
    const parsedData = ProjectCreateSchema.parse(data);
    const projectId = parsedData.id;

    this.#log("Create project: '%s'...", projectId);
    const gitHubDefaultBranch =
      parsedData.gitHubDefaultBranch || DEFAULT_GITHUB_BRANCH;

    await this.#tableClient.createTable();
    await this.#tableClient.createEntity({
      ...parsedData,
      partitionKey,
      rowKey: projectId,
      gitHubDefaultBranch,
    });

    await TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(projectId, "Labels")
    ).createTable();
    await TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(projectId, "Builds")
    ).createTable();
    await BlobServiceClient.fromConnectionString(
      connectionString
    ).createContainer(generateAzureStorageContainerName(projectId));
    await new LabelsModel(projectId).create({
      type: "branch",
      value: gitHubDefaultBranch,
    });

    return { ...parsedData, gitHubDefaultBranch };
  }
}

export class ProjectIdModel implements BaseIdModel<ProjectType> {
  id: string;
  #tableClient: TableClient;

  constructor(id: string) {
    const { connectionString } = getStore();
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      DEFAULT_SERVICE_NAME
    );
    this.id = id;
  }

  #log(...args: unknown[]) {
    getStore().context.log(`[${this.id}]`, ...args);
  }

  async get(): Promise<ProjectType> {
    this.#log("Get project...");
    const entity = await this.#tableClient.getEntity(partitionKey, this.id);

    return ProjectSchema.parse(entity);
  }

  async has(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch {
      return false;
    }
  }

  async update(data: unknown): Promise<void> {
    this.#log("Update project...");
    const parsedData = ProjectUpdateSchema.parse(data);
    await this.#tableClient.updateEntity(
      { partitionKey, rowKey: this.id, ...parsedData, id: this.id },
      "Merge"
    );
  }

  async delete(): Promise<void> {
    this.#log("Delete project...");
    const { connectionString } = getStore();
    await this.#tableClient.deleteEntity(partitionKey, this.id);
    await TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(this.id, "Labels")
    ).deleteTable();
    await TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(this.id, "Builds")
    ).deleteTable();
    await BlobServiceClient.fromConnectionString(
      connectionString
    ).deleteContainer(generateAzureStorageContainerName(this.id));
  }
}
