import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import type {
  RouterHandlerOptions,
  StorybookProjectTableEntity,
} from "../utils/types";
import {
  getAzureTableClient,
  listAzureTableEntities,
  upsertStorybookProjectToAzureTable,
} from "../utils/azure-data-tables";
import {
  CONTENT_TYPES,
  PROJECTS_TABLE_PARTITION_KEY,
} from "../utils/constants";
import { ProjectsTemplate } from "../templates/projects-template";
import { DocumentLayout } from "../templates/components/layout";
import { responseError, responseHTML } from "../utils/response-utils";
import { storybookProjectSchema } from "../utils/schemas";
import { joinUrl } from "../utils/url-join";

export async function listProjects(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Serving all projects...");

  const projects = await listAzureTableEntities(context, options, "Projects");

  const accept = request.headers.get("accept");
  if (accept?.includes(CONTENT_TYPES.HTML)) {
    return responseHTML(
      <ProjectsTemplate
        projects={projects}
        basePathname={new URL(request.url).pathname}
      />
    );
  }

  return { status: 200, jsonBody: projects };
}

export async function getProject(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId } = request.params;
  context.log("Serving project: '%s'...", projectId);

  if (!projectId) {
    return { status: 400, body: "Missing project ID" };
  }

  const client = getAzureTableClient(options, "Projects");

  try {
    const project = await client.getEntity<StorybookProjectTableEntity>(
      PROJECTS_TABLE_PARTITION_KEY,
      projectId
    );

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout title={project.id}>
          <pre safe>{JSON.stringify(project, null, 2)}</pre>
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: project };
  } catch (error) {
    return responseError(error, context, 404);
  }
}

export async function createProject(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType) {
      return responseError("Content-Type header is required", context, 400);
    }
    if (!contentType.includes(CONTENT_TYPES.FORM_ENCODED)) {
      return responseError(
        `Invalid Content-Type, expected ${CONTENT_TYPES.FORM_ENCODED}`,
        context,
        415
      );
    }

    const result = storybookProjectSchema.safeParse(
      Object.fromEntries((await request.formData()).entries())
    );
    if (!result.success) {
      return responseError(result.error, context, 400);
    }

    const data = result.data;
    context.log("Create project: '%s'...", data.id);

    await upsertStorybookProjectToAzureTable(options, context, data, "Replace");

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return {
        status: 302,
        headers: { Location: `/projects/${data.id}` },
      };
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        data,
        links: { self: { href: joinUrl(request.url, data.id) } },
      },
    };
  } catch (error) {
    return responseError(error, context);
  }
}
