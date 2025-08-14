import z from "zod";
import { TableClient } from "@azure/data-tables";
import type { InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import {
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_PURGE_AFTER_DAYS,
  DEFAULT_SERVICE_NAME,
} from "../utils/constants";
import {
  generateProjectAzureTableName,
  listAzureTableEntities,
  ListAzureTableEntitiesOptions,
} from "../utils/azure-data-tables";
import { generateAzureStorageContainerName } from "../utils/azure-storage-blob";
import { BuildSHASchema, ProjectIdSchema, type BaseModel } from "./shared";
import { BuildModel } from "./builds";
import { LabelModel } from "./labels";

export type ProjectType = z.infer<typeof ProjectSchema>;
/** @private */
export const ProjectSchema = z
  .object({
    id: ProjectIdSchema,
    name: z.string().meta({ description: "Name of the project." }),
    purgeBuildsAfterDays: z.coerce
      .number()
      .min(1)
      .default(DEFAULT_PURGE_AFTER_DAYS)
      .meta({
        description:
          "Days after which the builds in the project should be purged.",
      }),
    gitHubRepo: z.string().check(
      z.minLength(1, "Query-param 'gitHubRepo' is required."),
      z.refine(
        (val) => val.split("/").length === 2,
        "Query-param 'gitHubRepo' should be in the format 'owner/repo'."
      )
    ),
    gitHubPath: z.string().optional().meta({
      description:
        "Path to the storybook project with respect to repository root.",
    }),
    gitHubDefaultBranch: z
      .string()
      .default(DEFAULT_GITHUB_BRANCH)
      .meta({ description: "Default branch to use for GitHub repository" }),
    buildSHA: BuildSHASchema.optional(),
    timestamp: z.string().optional(),
  })
  .meta({
    id: "storybook-project",
    description: "Storybook project",
  });

type ProjectCreateType = z.infer<typeof ProjectCreateSchema>;
export const ProjectCreateSchema = ProjectSchema.omit({
  buildSHA: true,
  timestamp: true,
});

const partitionKey = "projects";

export class ProjectModel implements BaseModel<ProjectType, ProjectCreateType> {
  #connectionString: string;
  #context: InvocationContext;
  #blobService: BlobServiceClient;
  #tableClient: TableClient;

  constructor(context: InvocationContext, connectionString: string) {
    this.#connectionString = connectionString;
    this.#context = context;
    this.#blobService =
      BlobServiceClient.fromConnectionString(connectionString);
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      DEFAULT_SERVICE_NAME
    );
  }

  parse = ProjectSchema.parse;
  buildModel(projectId: string) {
    return new BuildModel(this.#context, this.#connectionString, projectId);
  }
  labelModel(projectId: string) {
    return new LabelModel(this.#context, this.#connectionString, projectId);
  }

  async list(
    options?: ListAzureTableEntitiesOptions<ProjectType>
  ): Promise<ProjectType[]> {
    this.#context.log("List projects...");
    const entities = await listAzureTableEntities(
      this.#context,
      this.#tableClient,
      options
    );

    return ProjectSchema.array().parse(entities);
  }

  async get(id: string): Promise<ProjectType> {
    this.#context.log("Get project: '%s'...", id);
    const entity = await this.#tableClient.getEntity(partitionKey, id);

    return ProjectSchema.parse(entity);
  }

  async has(id: string): Promise<boolean> {
    try {
      await this.get(id);
      return true;
    } catch {
      return false;
    }
  }

  async create(data: ProjectCreateType): Promise<void> {
    this.#context.log("Create project: '%s'...", data.id);
    const gitHubDefaultBranch =
      data.gitHubDefaultBranch || DEFAULT_GITHUB_BRANCH;

    await this.#tableClient.createTable();
    await this.#tableClient.createEntity({
      partitionKey,
      rowKey: data.id,
      ...data,
      gitHubDefaultBranch,
    });

    await TableClient.fromConnectionString(
      this.#connectionString,
      generateProjectAzureTableName(data.id, "Labels")
    ).createTable();
    await TableClient.fromConnectionString(
      this.#connectionString,
      generateProjectAzureTableName(data.id, "Builds")
    ).createTable();
    await this.#blobService.createContainer(
      generateAzureStorageContainerName(data.id)
    );
    await this.labelModel(data.id).create({
      type: "branch",
      value: gitHubDefaultBranch,
    });
  }

  async update(id: string, data: Partial<ProjectType>): Promise<void> {
    this.#context.log("Update project: '%s'...", id);
    await this.#tableClient.updateEntity(
      { partitionKey, rowKey: id, ...data, id },
      "Merge"
    );
  }

  async delete(id: string): Promise<void> {
    this.#context.log("Delete project: '%s'...", id);
    await this.#tableClient.deleteEntity(partitionKey, id);
    await TableClient.fromConnectionString(
      this.#connectionString,
      generateProjectAzureTableName(id, "Labels")
    ).deleteTable();
    await TableClient.fromConnectionString(
      this.#connectionString,
      generateProjectAzureTableName(id, "Builds")
    ).deleteTable();
    await this.#blobService.deleteContainer(
      generateAzureStorageContainerName(id)
    );
  }
}
