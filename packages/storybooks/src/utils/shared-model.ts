import z from "zod";
import type { ListAzureTableEntitiesOptions } from "./azure-data-tables";
import { PATTERNS } from "./constants";

type Obj = Record<string, unknown>;

export interface BaseModel<Data extends Obj> {
  list(options?: ListAzureTableEntitiesOptions<Data>): Promise<Data[]>;
  create(data: unknown): Promise<Data>;
}

export interface BaseIdModel<Data extends Obj> {
  get(): Promise<Data>;
  has(): Promise<boolean>;
  update(data: unknown): Promise<void>;
  delete(): Promise<void>;
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
