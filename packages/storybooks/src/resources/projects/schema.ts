import {
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_PURGE_AFTER_DAYS,
} from "#utils/constants";
import z from "zod";
import { BuildSHASchema, ProjectIdSchema } from "#utils/shared-model";

export type ProjectType = z.infer<typeof ProjectSchema>;
/** @private */
export const ProjectSchema = z
  .object({
    id: ProjectIdSchema,
    name: z.string().meta({ description: "Name of the project." }),
    purgeBuildsAfterDays: z.coerce
      .number()
      .min(1)
      .default(DEFAULT_PURGE_AFTER_DAYS)
      .meta({
        description:
          "Days after which the builds in the project should be purged.",
      }),
    gitHubRepo: z.string().check(
      z.minLength(1, "Query-param 'gitHubRepo' is required."),
      z.refine(
        (val) => val.split("/").length === 2,
        "Query-param 'gitHubRepo' should be in the format 'owner/repo'."
      )
    ),
    gitHubPath: z.string().optional().meta({
      description:
        "Path to the storybook project with respect to repository root.",
    }),
    gitHubDefaultBranch: z
      .string()
      .default(DEFAULT_GITHUB_BRANCH)
      .meta({ description: "Default branch to use for GitHub repository" }),
    buildSHA: BuildSHASchema.optional(),
    timestamp: z.string().optional(),
  })
  .meta({
    id: "storybook-project",
    description: "Storybook project",
  });

export type ProjectCreateType = z.infer<typeof ProjectCreateSchema>;
export const ProjectCreateSchema = ProjectSchema.omit({
  buildSHA: true,
  timestamp: true,
});

export type ProjectUpdateType = z.infer<typeof ProjectUpdateSchema>;
export const ProjectUpdateSchema = ProjectSchema.omit({
  id: true,
  timestamp: true,
}).partial();
