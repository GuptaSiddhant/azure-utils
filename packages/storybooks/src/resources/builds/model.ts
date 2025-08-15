import { BaseIdModel, BaseModel } from "#utils/shared-model";
import { getStore } from "#utils/store";
import { TableClient } from "@azure/data-tables";
import { BuildSchema, BuildType, BuildUploadType } from "./schema";
import {
  generateProjectAzureTableName,
  listAzureTableEntities,
  type ListAzureTableEntitiesOptions,
} from "#utils/azure-data-tables";
import { BlobServiceClient } from "@azure/storage-blob";
import { ProjectIdModel } from "#projects/model";
import {
  deleteBlobsFromAzureStorageContainerOrThrow,
  generateAzureStorageContainerName,
} from "#utils/azure-storage-blob";
import { LabelsModel } from "#labels/model";

export class BuildsModel implements BaseModel<BuildType> {
  projectModel: ProjectIdModel;
  #tableClient: TableClient;

  constructor(projectId: string) {
    const { connectionString } = getStore();

    this.projectModel = new ProjectIdModel(projectId);
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(projectId, "Builds")
    );
  }

  sha(sha: string) {
    return new BuildSHAModel(this.projectModel.id, sha);
  }

  #log(...args: unknown[]) {
    getStore().context.log(`[${this.projectModel.id}]`, ...args);
  }
  #error(...args: unknown[]) {
    getStore().context.error(`[${this.projectModel.id}]`, ...args);
  }

  async list(
    options?: ListAzureTableEntitiesOptions<BuildType>
  ): Promise<BuildType[]> {
    this.#log("List builds...");
    const entities = await listAzureTableEntities(this.#tableClient, options);
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

  async create(data: BuildUploadType): Promise<BuildType> {
    const { labels, sha, ...rest } = data;
    this.#log("Create build '%s'...", sha);

    for (const labelSlug of labels.filter(Boolean)) {
      await this.#tableClient.createEntity({
        partitionKey: labelSlug,
        rowKey: sha,
        ...rest,
        label: labelSlug,
        sha,
      });

      const labelsModel = new LabelsModel(this.projectModel.id);
      try {
        await labelsModel.slug(labelSlug).update({ buildSHA: sha });
      } catch {
        this.#log(
          "A new label '$s' is being created, please update its information",
          labelSlug
        );
        await labelsModel.create({
          value: labelSlug,
          buildSHA: sha,
          type: /\d+/.test(labelSlug) ? "pr" : "branch",
        });
      }
    }

    try {
      const project = await this.projectModel.get();
      if (labels.includes(project.gitHubDefaultBranch))
        this.projectModel.update({ buildSHA: sha });
    } catch (error) {
      this.#error(error);
    }

    return { ...data, label: labels.join(",") };
  }

  async deleteByLabel(labelSlug: string): Promise<void> {
    this.#log("Delete build by label: '%s'...", labelSlug);
    const { connectionString } = getStore();

    const matchingEntities = await listAzureTableEntities(this.#tableClient, {
      filter: `label eq '${labelSlug}'`,
    });

    const containerClient = BlobServiceClient.fromConnectionString(
      connectionString
    ).getContainerClient(
      generateAzureStorageContainerName(this.projectModel.id)
    );

    for (const entity of matchingEntities) {
      if (entity.partitionKey && entity.rowKey) {
        await this.#tableClient.deleteEntity(
          entity.partitionKey,
          entity.rowKey
        );

        const remainingLabelsForSHA = await listAzureTableEntities(
          this.#tableClient,
          { filter: `sha eq '${entity.rowKey}'` }
        );

        if (remainingLabelsForSHA.length === 0) {
          await deleteBlobsFromAzureStorageContainerOrThrow(
            containerClient,
            entity.rowKey // sha
          );
        }
      }
    }
  }
}

export class BuildSHAModel implements BaseIdModel<BuildType> {
  #projectId: string;
  #tableClient: TableClient;
  projectModel: ProjectIdModel;
  sha: string;

  constructor(projectId: string, sha: string) {
    const { connectionString } = getStore();

    this.#projectId = projectId;
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(projectId, "Builds")
    );
    this.sha = sha;
    this.projectModel = new ProjectIdModel(projectId);
  }

  #log(...args: unknown[]) {
    getStore().context.log(`[${this.projectModel.id}-${this.sha}]`, ...args);
  }

  async get(labelSlug?: string): Promise<BuildType> {
    this.#log("Get build...");

    if (labelSlug) {
      const entity = await this.#tableClient.getEntity(labelSlug, this.sha);
      return BuildSchema.parse(entity);
    }

    const entities = await new BuildsModel(this.#projectId).list({
      filter: `RowKey eq '${this.sha}'`,
    });

    return BuildSchema.parse(entities.at(0));
  }

  async has(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch {
      return false;
    }
  }

  async update(): Promise<void> {
    throw new Error("Update operation is not supported for builds.");
  }

  async delete(): Promise<void> {
    this.#log("Delete build...");
    const { connectionString } = getStore();

    const matchingEntities = await listAzureTableEntities(this.#tableClient, {
      filter: `sha eq '${this.sha}'`,
    });

    for (const entity of matchingEntities) {
      if (entity.partitionKey && entity.rowKey)
        await this.#tableClient.deleteEntity(
          entity.partitionKey,
          entity.rowKey
        );
    }

    await deleteBlobsFromAzureStorageContainerOrThrow(
      BlobServiceClient.fromConnectionString(
        connectionString
      ).getContainerClient(generateAzureStorageContainerName(this.#projectId)),
      this.sha
    );
  }
}
