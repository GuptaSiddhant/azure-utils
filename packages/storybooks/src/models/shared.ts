import z from "zod";
import { ListAzureTableEntitiesOptions } from "../utils/azure-data-tables";
import { PATTERNS } from "../utils/constants";

export interface BaseModel<
  Data extends Record<string, unknown>,
  CreateData = Data,
  UpdateData = Partial<Data>
> {
  list(options?: ListAzureTableEntitiesOptions<Data>): Promise<Data[]>;
  create(data: CreateData): Promise<void>;
  get(id: string): Promise<Data | null>;
  has(id: string): Promise<boolean>;
  update(id: string, data: UpdateData): Promise<void>;
  delete(id: string): Promise<void>;
}

/** @private */
export const ProjectIdSchema = z
  .string()
  .refine(
    (val) => new RegExp(PATTERNS.projectId.pattern).test(val),
    PATTERNS.projectId.message
  )
  .meta({ id: "projectId", description: "The ID of the project." });

/** @private */
export const BuildSHASchema = z
  .string()
  .check(z.minLength(7))
  .meta({ id: "buildSHA", description: "The SHA of the build." });

/** @private */
export const LabelSlugSchema = z
  .string()
  .meta({ id: "labelSlug", description: "The slug of the label." });

/** @private */
export const EmptyObjectSchema = z.object();
