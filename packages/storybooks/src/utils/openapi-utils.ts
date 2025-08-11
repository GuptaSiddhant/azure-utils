import type {
  ZodOpenApiPathItemObject,
  ZodOpenApiPathsObject,
  ZodOpenApiSchemaObject,
  ZodOpenApiSecuritySchemeObject,
} from "zod-openapi";
import {
  storybookBuildSchema,
  storybookBuildUploadSchema,
  storybookLabelSchema,
  storybookProjectCreateSchema,
  storybookProjectSchema,
} from "./schemas";

export const openAPIPaths: ZodOpenApiPathsObject = {};

export function registerOpenAPIPath(
  path: string,
  input: ZodOpenApiPathItemObject
) {
  path ||= "/";
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  const value = openAPIPaths[path];

  if (value) {
    openAPIPaths[path] = { ...value, ...input };
  } else {
    openAPIPaths[path] = input;
  }
}

export const openAPITags = {
  projects: {
    name: "Projects",
    description:
      "A project manages a single Storybook instance across multiple builds.",
  },
  builds: {
    name: "Builds",
    description: "A build is a specific version of a Storybook instance.",
  },
  labels: {
    name: "Labels",
    description:
      "Labels can be used to manage multiple Storybook instances. Labels can be git-branches or Pull Requests.",
  },
  storybook: {
    name: "Storybook",
    description: "View storybook files for a specific project and build.",
  },
  webUI: {
    name: "Web UI",
    description: "Serves static files for web-ui.",
  },
} satisfies Record<string, { name: string; description?: string }>;

export const openAPISchemas: Record<string, ZodOpenApiSchemaObject> = {
  storybookProjectSchema,
  storybookBuildSchema,
  storybookLabelSchema,
  storybookBuildUploadSchema,
  storybookProjectCreateSchema,
};

export const openAPISecuritySchemas: Record<
  string,
  ZodOpenApiSecuritySchemeObject
> = {};
