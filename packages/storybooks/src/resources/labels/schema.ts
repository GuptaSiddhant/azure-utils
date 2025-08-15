import z from "zod";
import { BuildSHASchema, LabelSlugSchema } from "#utils/shared-model";

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

export type LabelCreateType = z.infer<typeof LabelCreateSchema>;
export const LabelCreateSchema = LabelSchema.omit({
  slug: true,
  timestamp: true,
});

export type LabelUpdateType = z.infer<typeof LabelUpdateSchema>;
export const LabelUpdateSchema = LabelSchema.omit({
  slug: true,
  timestamp: true,
}).partial();
