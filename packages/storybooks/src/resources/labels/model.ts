import { TableClient } from "@azure/data-tables";
import {
  generateProjectAzureTableName,
  listAzureTableEntities,
  ListAzureTableEntitiesOptions,
} from "#utils/azure-data-tables";
import { BaseIdModel, BaseModel } from "#utils/shared-model";
import {
  LabelCreateSchema,
  LabelSchema,
  LabelType,
  LabelUpdateSchema,
} from "./schema";
import { ProjectIdModel } from "#projects/model";
import { getStore } from "#utils/store";
import { BuildsModel } from "#builds/model";

export class LabelsModel implements BaseModel<LabelType> {
  projectModel: ProjectIdModel;
  #tableClient: TableClient;

  constructor(projectId: string) {
    const { connectionString } = getStore();

    this.projectModel = new ProjectIdModel(projectId);
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(projectId, "Labels")
    );
  }

  slug(slug: string) {
    return new LabelSlugModel(this.projectModel.id, slug);
  }

  #log(...args: unknown[]) {
    getStore().context.log(`[${this.projectModel.id}]`, ...args);
  }

  async list(
    options?: ListAzureTableEntitiesOptions<LabelType>
  ): Promise<LabelType[]> {
    this.#log("List labels'...");
    const entities = await listAzureTableEntities(this.#tableClient, options);

    return LabelSchema.array().parse(entities);
  }

  async create(data: unknown): Promise<LabelType> {
    const parsedData = LabelCreateSchema.parse(data);
    this.#log("Create label '%s''...", parsedData.value);

    const slug = LabelsModel.createSlug(parsedData.value);
    await this.#tableClient.createEntity({
      ...parsedData,
      partitionKey: this.projectModel.id,
      rowKey: slug,
      slug,
    });

    return { ...parsedData, slug };
  }

  static createSlug(value: string) {
    return value.trim().toLowerCase().replace(/\W+/, "-");
  }
}

export class LabelSlugModel implements BaseIdModel<LabelType> {
  projectModel: ProjectIdModel;
  #tableClient: TableClient;
  slug: string;

  constructor(projectId: string, slug: string) {
    const { connectionString } = getStore();

    this.projectModel = new ProjectIdModel(projectId);
    this.#tableClient = TableClient.fromConnectionString(
      connectionString,
      generateProjectAzureTableName(projectId, "Labels")
    );
    this.slug = slug;
  }

  #log(...args: unknown[]) {
    getStore().context.log(`[${this.projectModel.id}-${this.slug}]`, ...args);
  }
  #warn(...args: unknown[]) {
    getStore().context.warn(`[${this.projectModel.id}-${this.slug}]`, ...args);
  }

  async get(): Promise<LabelType> {
    this.#log("Get label...");
    const entity = await this.#tableClient.getEntity(
      this.projectModel.id,
      this.slug
    );

    return LabelSchema.parse(entity);
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
    this.#log("Update label...");
    const parsedData = LabelUpdateSchema.parse(data);

    await this.#tableClient.updateEntity(
      {
        ...parsedData,
        partitionKey: this.projectModel.id,
        rowKey: this.slug,
        slug: this.slug,
      },
      "Merge"
    );
  }

  async delete(): Promise<void> {
    this.#log("Delete label...");

    const { gitHubDefaultBranch } = await this.projectModel.get();
    if (this.slug === LabelsModel.createSlug(gitHubDefaultBranch)) {
      const message = `Cannot delete the label associated with default branch (${gitHubDefaultBranch}) of the project '${this.projectModel.id}'.`;
      this.#warn(message);
      throw new Error(message);
    }

    await this.#tableClient.deleteEntity(this.projectModel.id, this.slug);
    await new BuildsModel(this.projectModel.id).deleteByLabel(this.slug);
  }
}
