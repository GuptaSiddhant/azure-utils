import { z } from "zod/v4";

export type StorybookProject = z.infer<typeof storybookProjectSchema>;
export type StorybookBuild = z.infer<typeof storybookBuildSchema>;
export type StorybookLabel = z.infer<typeof storybookLabelSchema>;

export const emptyObjectSchema = z.object({});

export const projectIdSchema = z
  .string()
  .meta({ id: "projectId", description: "The ID of the project." });

export const buildSHASchema = z
  .string()
  .check(
    z.minLength(
      7,
      "Query-param 'commitSha' is required and should be at least 7 characters long."
    )
  )
  .meta({ id: "buildSHA", description: "The SHA of the build." });

export const labelSlugSchema = z
  .string()
  .meta({ id: "labelSlug", description: "The slug of the label." });

export const storybookBuildSchema = z.object({
  project: projectIdSchema,
  labels: z.string(),
  sha: buildSHASchema,
  authorName: z.string(),
  authorEmail: z
    .string()
    .refine((val) => val.includes("@"), "Invalid email format")
    .meta({ description: "Email of the author" }),
  message: z.optional(z.string()),
  timestamp: z.string().optional(),
});

export const storybookLabelSchema = z
  .object({
    slug: labelSlugSchema,
    value: z.string().meta({ description: "The value of the label." }),
    buildSHA: buildSHASchema.optional(),
    timestamp: z.string().optional(),
  })
  .meta({ id: "storybook-label", description: "A Storybook label." });

export const storybookProjectSchema = z
  .object({
    id: z.string().meta({ description: "ID of the project." }),
    name: z.string().meta({ description: "Name of the project." }),
    gitHubRepo: z.string().check(
      z.minLength(1, "Query-param 'gitHubRepo' is required."),
      z.refine(
        (val) => val.split("/").length === 2,
        "Query-param 'gitHubRepo' should be in the format 'owner/repo'."
      )
    ),
    buildSHA: buildSHASchema.optional(),
    timestamp: z.string().optional(),
  })
  .meta({
    id: "storybook-project",
    description: "Storybook project",
  });

//

export const storybookBuildUploadSchema = storybookBuildSchema.omit({
  project: true,
});

export const storybookProjectCreateSchema = storybookProjectSchema.omit({
  buildSHA: true,
  timestamp: true,
});
