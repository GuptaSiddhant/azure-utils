import { z } from "zod/v4";

export type StorybookMetadata = z.infer<
  typeof storybookUploadQueryParamsSchema
>;

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

export const storybookUploadQueryParamsSchema = z
  .object({
    project: projectNameSchema,
    branch: branchSchema,
    commitSha: commitShaSchema,
    title: z.string().check(z.minLength(1, "Query-param 'title' is required.")),
    gitHubRepo: z.string().check(
      z.minLength(1, "Query-param 'gitHubRepo' is required."),
      z.refine(
        (val) => val.split("/").length === 2,
        "Query-param 'gitHubRepo' should be in the format 'owner/repo'."
      )
    ),
    authorName: z.string(),
    authorEmail: z.email().meta({
      description: "Email of the author",
    }),
    commitMessage: z.optional(z.string()),
    gitHubPrNumber: z.optional(
      z.string().regex(/^\d+$/).meta({ description: "GitHub PR number" })
    ),
    jiraKey: z.optional(z.string()),
  })
  .meta({
    id: "storybook-metadata",
    description: "Metadata of a Storybook",
    examples: [
      {
        project: "project-id",
        commitSha: "123dwe1",
        branch: "feat/my-feature",
      },
    ],
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
