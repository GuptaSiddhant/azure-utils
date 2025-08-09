import { storybookProjectSchema } from "../utils/schemas";
import type { StorybooksRouterHttpHandler } from "../utils/types";
import { upsertStorybookProjectToAzureTable } from "../utils/azure-data-tables";
import { responseError } from "../utils/response-utils";

export const createProjectHandler: StorybooksRouterHttpHandler =
  (options) => async (request, context) => {
    try {
      const dataParseResult = storybookProjectSchema.safeParse(
        Object.fromEntries((await request.formData()).entries())
      );
      if (!dataParseResult.success) {
        return responseError(dataParseResult.error, context, 400);
      }

      const data = dataParseResult.data;
      await upsertStorybookProjectToAzureTable(options, context, data);

      return {
        status: 202,
        jsonBody: { success: true, data },
      };
    } catch (error) {
      return responseError(error, context);
    }
  };
