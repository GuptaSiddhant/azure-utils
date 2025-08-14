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

export type LabelType = z.infer<typeof LabelSchema>;
/** @private */
export const LabelSchema = z
  .object({
    slug: LabelSlugSchema,
    value: z.string().meta({ description: "The value of the label." }),
    type: z.enum(["branch", "pr"]).optional(),
    buildSHA: BuildSHASchema.optional(),
    timestamp: z.string().optional(),
  })
  .meta({ id: "storybook-label", description: "A Storybook label." });

export class LabelModel implements BaseModel<LabelType> {
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

  parse = LabelSchema.parse;

  async list(
    options?: ListAzureTableEntitiesOptions<LabelType>
  ): Promise<LabelType[]> {
    const entities = await listAzureTableEntities(
      this.#context,
      this.#tableClient,
      options
    );

    return LabelSchema.array().parse(entities);
  }

  async get(slug: string): Promise<LabelType> {
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

  async create(data: LabelType): Promise<void> {
    await this.#tableClient.createEntity({
      partitionKey: this.#projectId,
      rowKey: data.slug,
      ...data,
    });
  }

  async update(slug: string, data: Partial<LabelType>): Promise<void> {
    await this.#tableClient.updateEntity(
      { partitionKey: this.#projectId, rowKey: slug, ...data, slug },
      "Merge"
    );
  }

  async delete(slug: string): Promise<void> {
    await this.#tableClient.deleteEntity(this.#projectId, slug);
    await this.projectModel.buildModel(this.#projectId).deleteByLabel(slug);
  }
}
