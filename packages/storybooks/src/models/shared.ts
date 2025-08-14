import z from "zod";
import { ListAzureTableEntitiesOptions } from "../utils/azure-data-tables";

export interface BaseModel<T extends Record<string, unknown>, C = T> {
  list(options?: ListAzureTableEntitiesOptions<T>): Promise<T[]>;
  create(data: C): Promise<void>;
  get(id: string): Promise<T | null>;
  has(id: string): Promise<boolean>;
  update(id: string, data: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  parse: (data: unknown) => T;
}

/** @private */
export const ProjectIdSchema = z
  .string()
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
