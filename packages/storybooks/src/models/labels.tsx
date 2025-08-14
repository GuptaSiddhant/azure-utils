import z from "zod";
import { TableClient } from "@azure/data-tables";
import type { InvocationContext } from "@azure/functions";
import {
  generateProjectAzureTableName,
  listAzureTableEntities,
  ListAzureTableEntitiesOptions,
} from "../utils/azure-data-tables";
import { BuildSHASchema, LabelSlugSchema, type BaseModel } from "./shared";
import { ProjectModel } from "./projects";

export const labelTypes = ["branch", "pr"] as const;

export type LabelType = z.infer<typeof LabelSchema>;
/** @private */
export const LabelSchema = z
  .object({
    slug: LabelSlugSchema,
    value: z.string().meta({ description: "The value of the label." }),
    type: z.enum(labelTypes),
    buildSHA: BuildSHASchema.optional(),
    timestamp: z.string().optional(),
  })
  .meta({ id: "storybook-label", description: "A Storybook label." });

type LabelCreateType = z.infer<typeof LabelCreateSchema>;
export const LabelCreateSchema = LabelSchema.omit({
  slug: true,
  timestamp: true,
});

type LabelUpdateType = z.infer<typeof LabelUpdateSchema>;
export const LabelUpdateSchema = LabelSchema.omit({
  slug: true,
  timestamp: true,
}).partial();

export class LabelModel
  implements BaseModel<LabelType, LabelCreateType, LabelUpdateType>
{
  #context: InvocationContext;
  #projectId: string;
  #tableClient: TableClient;
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
      generateProjectAzureTableName(projectId, "Labels")
    );
    this.projectModel = new ProjectModel(context, connectionString);
  }

  async list(
    options?: ListAzureTableEntitiesOptions<LabelType>
  ): Promise<LabelType[]> {
    this.#context.log("List labels for project '%s'...", this.#projectId);
    const entities = await listAzureTableEntities(
      this.#context,
      this.#tableClient,
      options
    );

    return LabelSchema.array().parse(entities);
  }

  async get(slug: string): Promise<LabelType> {
    this.#context.log(
      "Get label '%s' for project '%s'...",
      slug,
      this.#projectId
    );
    const entity = await this.#tableClient.getEntity(this.#projectId, slug);

    return LabelSchema.parse(entity);
  }

  async has(slug: string): Promise<boolean> {
    try {
      await this.get(slug);
      return true;
    } catch {
      return false;
    }
  }

  async create(data: LabelCreateType): Promise<void> {
    this.#context.log(
      "Create label '%s' for project '%s'...",
      data.value,
      this.#projectId
    );

    const slug = LabelModel.createSlug(data.value);
    await this.#tableClient.createEntity({
      ...data,
      partitionKey: this.#projectId,
      rowKey: slug,
      slug,
    });
  }

  async update(slug: string, data: LabelUpdateType): Promise<void> {
    this.#context.log(
      "Update label '%s' for project '%s'...",
      slug,
      this.#projectId
    );

    await this.#tableClient.updateEntity(
      { ...data, partitionKey: this.#projectId, rowKey: slug, slug },
      "Merge"
    );
  }

  async delete(slug: string): Promise<void> {
    this.#context.log(
      "Delete label '%s' for project '%s'...",
      slug,
      this.#projectId
    );

    const { gitHubDefaultBranch } = await this.projectModel.get(
      this.#projectId
    );
    if (slug === LabelModel.createSlug(gitHubDefaultBranch)) {
      const message = `Cannot delete the label associated with default branch (${gitHubDefaultBranch}) of the project '${
        this.#projectId
      }'.`;
      this.#context.warn(message);
      throw new Error(message);
    }

    await this.#tableClient.deleteEntity(this.#projectId, slug);
    await this.projectModel.buildModel(this.#projectId).deleteByLabel(slug);
  }

  static createSlug(value: string) {
    return value.trim().toLowerCase().replace(/\W+/, "-");
  }
}
