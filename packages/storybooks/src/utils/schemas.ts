import { z } from "zod/mini";

export type StorybookMetadata = z.infer<typeof storybookMetadataSchema>;

export const storybookMetadataSchema = z.object({
  project: z
    .string()
    .check(z.minLength(1, "Query-param 'project' is required.")),
  branch: z.string().check(z.minLength(1, "Query-param 'branch' is required.")),
  commitSha: z
    .string()
    .check(
      z.minLength(
        7,
        "Query-param 'commitSha' is required and should be at least 7 characters long."
      )
    ),
  title: z.string().check(z.minLength(1, "Query-param 'title' is required.")),
  gitHubRepo: z.string().check(
    z.minLength(1, "Query-param 'gitHubRepo' is required."),
    z.refine(
      (val) => val.split("/").length === 2,
      "Query-param 'gitHubRepo' should be in the format 'owner/repo'."
    )
  ),
  authorName: z.string(),
  authorEmail: z.email(),
  commitMessage: z.optional(z.string()),
  gitHubPrNumber: z.optional(z.string().check(z.regex(/^\d+$/))),
  jiraKey: z.optional(z.string()),
});
