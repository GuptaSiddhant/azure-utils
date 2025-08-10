import { z } from "zod/v4";

export type StorybookMetadata = z.infer<typeof storybookMetadataSchema>;
export type StorybookProject = z.infer<typeof storybookProjectSchema>;
export type StorybookBuild = z.infer<typeof storybookBuildSchema>;
export type StorybookLabel = z.infer<typeof storybookLabelSchema>;

export const emptyObjectSchema = z.object({});

export const projectIdSchema = z
  .string()
  .meta({ id: "projectId", description: "The ID of the project." });

export const buildSHASchema = z
  .string()
  .meta({ id: "buildSHA", description: "The SHA of the build." });

export const labelSlugSchema = z
  .string()
  .meta({ id: "labelSlug", description: "The slug of the label." });

const projectNameSchema = z
  .string()
  .check(z.minLength(1, "Query-param 'project' is required."));
const commitShaSchema = z
  .string()
  .check(
    z.minLength(
      7,
      "Query-param 'commitSha' is required and should be at least 7 characters long."
    )
  );
const branchSchema = z
  .string()
  .check(z.minLength(1, "Query-param 'branch' is required."));
const gitHubRepo = z.string().check(
  z.minLength(1, "Query-param 'gitHubRepo' is required."),
  z.refine(
    (val) => val.split("/").length === 2,
    "Query-param 'gitHubRepo' should be in the format 'owner/repo'."
  )
);

export const storybookBuildSchema = z.object({
  project: projectIdSchema,
  labels: z.string(),
  sha: commitShaSchema,
  authorName: z.string(),
  authorEmail: z
    .string()
    .refine((val) => val.includes("@"), "Invalid email format")
    .meta({ description: "Email of the author" }),
  message: z.optional(z.string()),
  timestamp: z.string().optional(),
});

export const storybookBuildUploadSchema = storybookBuildSchema.omit({
  project: true,
});

export const storybookLabelSchema = z
  .object({
    slug: labelSlugSchema,
    value: z.string().meta({ description: "The value of the label." }),
    timestamp: z.string().optional(),
  })
  .meta({ id: "storybook-label", description: "A Storybook label." });

export const storybookMetadataSchema = z
  .object({
    project: projectNameSchema,
    branch: branchSchema,
    commitSha: commitShaSchema,
    title: z.string().check(z.minLength(1, "Query-param 'title' is required.")),
    gitHubRepo,
    authorName: z.string(),
    authorEmail: z
      .string()
      .refine((val) => val.includes("@"), "Invalid email format")
      .meta({ description: "Email of the author" }),
    commitMessage: z.optional(z.string()),
    gitHubPrNumber: z.optional(
      z.string().regex(/^\d+$/).meta({ description: "GitHub PR number" })
    ),
    jiraKey: z.optional(z.string()),
    timestamp: z.string().optional(),
  })
  .meta({
    id: "storybook-metadata",
    title: "storybook-metadata",
    description: "Metadata of a Storybook",
    examples: [
      {
        project: "project-id",
        commitSha: "123dwe1",
        branch: "feat/my-feature",
      },
    ],
  });

export const storybookProjectSchema = z
  .object({
    id: z.string().meta({ description: "ID of the project." }),
    name: z.string().meta({ description: "Name of the project." }),
    gitHubRepo,
    timestamp: z.string().optional(),
  })
  .meta({
    id: "storybook-project",
    description: "Storybook project",
  });

export const storybookDeleteQueryParamsSchema = z
  .object({
    project: projectNameSchema,
    commitSha: commitShaSchema.optional(),
    branch: branchSchema.optional(),
  })
  .refine((value) => value.commitSha || value.branch, {
    error: "Provide at least one param: 'commitSha' or 'branch'.",
  })
  .meta({
    override: ({ jsonSchema }) => {
      jsonSchema.anyOf = jsonSchema.oneOf;
      delete jsonSchema.oneOf;
    },
  });
