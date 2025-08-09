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
  getAzureProjectsTableClient,
  getAzureTableClientForProject,
  listAzureTableEntities,
  upsertStorybookProjectToAzureTable,
} from "../utils/azure-data-tables";
import {
  CONTENT_TYPES,
  PROJECTS_TABLE_PARTITION_KEY,
  urlBuilder,
} from "../utils/constants";
import { ProjectsTable } from "../components/projects-table";
import { DocumentLayout } from "../components/layout";
import { responseError, responseHTML } from "../utils/response-utils";
import { storybookBuildSchema, storybookProjectSchema } from "../utils/schemas";
import { RawDataPreview } from "../components/raw-data";
import { generateRequestStore, requestStore } from "../utils/stores";
import {
  generateAzureStorageContainerName,
  getAzureStorageBlobServiceClient,
} from "../utils/azure-storage-blob";
import { BuildTable } from "../components/builds-table";

export async function listProjects(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  try {
    context.log("Serving all projects...");

    const entities = await listAzureTableEntities(
      context,
      getAzureProjectsTableClient(options.connectionString)
    );
    const projects = storybookProjectSchema.array().parse(entities);

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout title="All Projects">
          <ProjectsTable projects={projects} />
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: projects };
  } catch (error) {
    return responseError(error, context, 500);
  }
}

export async function getProject(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  const { projectId } = request.params;
  context.log("Serving project: '%s'...", projectId);

  if (!projectId) {
    return { status: 400, body: "Missing project ID" };
  }

  const client = getAzureProjectsTableClient(options.connectionString);

  try {
    const project = storybookProjectSchema.parse(
      await client.getEntity<StorybookProjectTableEntity>(
        PROJECTS_TABLE_PARTITION_KEY,
        projectId
      )
    );

    const builds = await listAzureTableEntities(
      context,
      getAzureTableClientForProject(
        options.connectionString,
        projectId,
        "Builds"
      ),
      { limit: 10 }
    );

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title={project.name}
          breadcrumbs={[{ label: "Projects", href: urlBuilder.allProjects() }]}
        >
          <>
            <RawDataPreview data={project} />
            <BuildTable builds={storybookBuildSchema.array().parse(builds)} />
          </>
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
  requestStore.enterWith(generateRequestStore(request, options));

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

    await getAzureStorageBlobServiceClient(
      options.connectionString
    ).createContainer(generateAzureStorageContainerName(data.id));
    await upsertStorybookProjectToAzureTable(options, context, data, "Replace");

    const projectUrl = urlBuilder.projectId(data.id);
    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return { status: 303, headers: { Location: projectUrl } };
    }

    return {
      status: 201,
      headers: { Location: projectUrl },
      jsonBody: { data, links: { self: projectUrl } },
    };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function updateProject(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  try {
    const { projectId } = request.params;
    context.log("Updating project: '%s'...", projectId);

    if (!projectId) {
      return { status: 400, body: "Missing project ID" };
    }

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

    const result = storybookProjectSchema
      .partial()
      .safeParse(Object.fromEntries((await request.formData()).entries()));
    if (!result.success) {
      return responseError(result.error, context, 400);
    }

    const data = result.data;

    const client = getAzureProjectsTableClient(options.connectionString);
    await client.updateEntity(
      {
        ...data,
        partitionKey: PROJECTS_TABLE_PARTITION_KEY,
        rowKey: projectId,
        id: projectId,
      },
      "Merge"
    );

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return { status: 303, headers: { Location: request.url } };
    }

    const updatedEntity = await client.getEntity<StorybookProjectTableEntity>(
      PROJECTS_TABLE_PARTITION_KEY,
      projectId
    );

    return {
      status: 202,
      headers: { Location: request.url },
      jsonBody: {
        data: storybookProjectSchema.parse(updatedEntity),
        links: { self: request.url },
      },
    };
  } catch (error) {
    return responseError(error, context, 404);
  }
}

export async function deleteProject(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  try {
    const { projectId } = request.params;
    context.log("Deleting project: '%s'...", projectId);

    if (!projectId) {
      return { status: 400, body: "Missing project ID" };
    }

    await Promise.allSettled([
      getAzureStorageBlobServiceClient(
        options.connectionString
      ).deleteContainer(generateAzureStorageContainerName(projectId)),
      getAzureTableClientForProject(
        options.connectionString,
        projectId,
        "Builds"
      ).deleteTable(),
      getAzureTableClientForProject(
        options.connectionString,
        projectId,
        "Labels"
      ).deleteTable(),
      getAzureProjectsTableClient(options.connectionString).deleteEntity(
        PROJECTS_TABLE_PARTITION_KEY,
        projectId
      ),
    ]);

    const projectsUrl = urlBuilder.allProjects();
    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return { status: 303, headers: { Location: projectsUrl } };
    }

    return { status: 204, headers: { Location: projectsUrl } };
  } catch (error) {
    return responseError(error, context, 404);
  }
}
