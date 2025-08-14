import z from "zod";
import { TableClient } from "@azure/data-tables";
import type { InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import {
  generateProjectAzureTableName,
  listAzureTableEntities,
  ListAzureTableEntitiesOptions,
} from "../utils/azure-data-tables";
import {
  deleteBlobsFromAzureStorageContainerOrThrow,
  generateAzureStorageContainerName,
} from "../utils/azure-storage-blob";
import { BuildSHASchema, type BaseModel } from "./shared";
import { ProjectModel } from "./projects";

export type BuildType = z.infer<typeof BuildSchema>;
/** @private */
export const BuildSchema = z.object({
  label: z.string(),
  sha: BuildSHASchema,
  authorName: z.string(),
  authorEmail: z
    .string()
    .refine((val) => val.includes("@"), "Invalid email format")
    .meta({ description: "Email of the author" }),
  message: z.optional(z.string()),
  timestamp: z.string().optional(),
});

/** @private */
export type BuildUploadType = z.infer<typeof BuildUploadSchema>;
export const BuildUploadSchema = BuildSchema.omit({ label: true }).extend({
  labels: z.string().array().meta({
    description:
      "Label slugs associated with the build. Must be created beforehand.",
  }),
});
export type BuildUploadFormType = z.infer<typeof BuildUploadSchema>;
export const BuildUploadFormSchema = BuildUploadSchema.extend({
  zipFile: z.file(),
});

/**
 * - partitionKey: label
 * - rowKey: sha
 */
export class BuildModel implements BaseModel<BuildType, BuildUploadType> {
  #context: InvocationContext;
  #projectId: string;
  #tableClient: TableClient;
  #blobService: BlobServiceClient;
  projectModel: ProjectModel;

  constructor(
    context: InvocationContext,
    connectionString: string,
    projectId: string
  ) {
    this.#context = context;
    this.#projectId = projectId;
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(projectId, "Builds")
    );
    this.#blobService =
      BlobServiceClient.fromConnectionString(connectionString);
    this.projectModel = new ProjectModel(context, connectionString);
  }

  parse = BuildSchema.parse;

  async list(
    options?: ListAzureTableEntitiesOptions<BuildType>
  ): Promise<BuildType[]> {
    this.#context.log("List builds for project '%s'...", this.#projectId);
    const entities = await listAzureTableEntities(
      this.#context,
      this.#tableClient,
      options
    );

    const builds = BuildSchema.array().parse(entities);

    const groupBySHA = Object.groupBy(builds, (b) => b.sha);
    const groupedBuilds: BuildType[] = Object.values(groupBySHA)
      .map((group) =>
        group && group.length > 0
          ? { ...group[0]!, label: group.map((b) => b.label).join(",") }
          : undefined
      )
      .filter((build) => build !== undefined);

    return groupedBuilds;
  }

  async get(sha: string, labelSlug?: string): Promise<BuildType> {
    this.#context.log(
      "Get build: '%s' for project '%s'...",
      sha,
      this.#projectId
    );
    const entity = labelSlug
      ? await this.#tableClient.getEntity(labelSlug, sha)
      : (await this.list({ filter: `RowKey eq '${sha}'` })).at(0);

    return BuildSchema.parse(entity);
  }

  async has(sha: string): Promise<boolean> {
    try {
      await this.get(sha);
      return true;
    } catch {
      return false;
    }
  }

  async create(data: BuildUploadType): Promise<void> {
    const { labels, sha, ...rest } = data;
    this.#context.log(
      "Create build '%s' for project '%s'...",
      sha,
      this.#projectId
    );

    for (const labelSlug of labels.filter(Boolean)) {
      await this.#tableClient.createEntity({
        partitionKey: labelSlug,
        rowKey: sha,
        ...rest,
        label: labelSlug,
        sha,
      });

      const labelModel = this.projectModel.labelModel(this.#projectId);
      try {
        await labelModel.update(labelSlug, { buildSHA: sha });
      } catch {
        this.#context.log(
          "A new label '$s' is being created, please update its information",
          labelSlug
        );
        await labelModel.create({
          value: labelSlug,
          buildSHA: sha,
          type: /\d+/.test(labelSlug) ? "pr" : "branch",
        });
      }
    }

    try {
      const project = await this.projectModel.get(this.#projectId);
      if (labels.includes(project.gitHubDefaultBranch))
        this.projectModel.update(project.id, { buildSHA: sha });
    } catch (error) {
      this.#context.error(error);
    }
  }

  async update(): Promise<void> {
    throw new Error("Update operation is not supported for builds.");
  }

  async delete(sha: string): Promise<void> {
    this.#context.log(
      "Delete build: '%s' for project '%s'...",
      sha,
      this.#projectId
    );
    const matchingEntities = await listAzureTableEntities(
      this.#context,
      this.#tableClient,
      { filter: `sha eq '${sha}'` }
    );

    for (const entity of matchingEntities) {
      if (entity.partitionKey && entity.rowKey)
        await this.#tableClient.deleteEntity(
          entity.partitionKey,
          entity.rowKey
        );
    }

    const containerClient = this.#blobService.getContainerClient(
      generateAzureStorageContainerName(this.#projectId)
    );
    await deleteBlobsFromAzureStorageContainerOrThrow(
      this.#context,
      containerClient,
      sha
    );
  }

  async deleteByLabel(labelSlug: string): Promise<void> {
    this.#context.log(
      "Delete build by label: '%s' for project '%s'...",
      labelSlug,
      this.#projectId
    );
    const matchingEntities = await listAzureTableEntities(
      this.#context,
      this.#tableClient,
      { filter: `label eq '${labelSlug}'` }
    );

    const containerClient = this.#blobService.getContainerClient(
      generateAzureStorageContainerName(this.#projectId)
    );

    for (const entity of matchingEntities) {
      if (entity.partitionKey && entity.rowKey) {
        await this.#tableClient.deleteEntity(
          entity.partitionKey,
          entity.rowKey
        );

        const remainingLabelsForSHA = await listAzureTableEntities(
          this.#context,
          this.#tableClient,
          { filter: `sha eq '${entity.rowKey}'` }
        );

        if (remainingLabelsForSHA.length === 0) {
          await deleteBlobsFromAzureStorageContainerOrThrow(
            this.#context,
            containerClient,
            entity.rowKey // sha
          );
        }
      }
    }
  }
}
