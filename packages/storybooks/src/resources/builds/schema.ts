import { BuildSHASchema } from "#utils/shared-model";
import z from "zod";

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

export type BuildUploadType = z.infer<typeof BuildUploadSchema>;
/** @private */
export const BuildUploadSchema = BuildSchema.omit({ label: true }).extend({
  labels: z.string().array().meta({
    description:
      "Label slugs associated with the build. Must be created beforehand.",
  }),
});

export type BuildUploadFormType = z.infer<typeof BuildUploadSchema>;
/** @private */
export const BuildUploadFormSchema = BuildUploadSchema.extend({
  zipFile: z.file(),
});
