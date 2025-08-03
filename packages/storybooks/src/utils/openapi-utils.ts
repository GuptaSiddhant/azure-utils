import type {
  ZodOpenApiPathItemObject,
  ZodOpenApiPathsObject,
} from "zod-openapi";

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
