import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CONTENT_TYPES, urlBuilder } from "../utils/constants";
import { ProjectsTable } from "../components/projects-table";
import { DocumentLayout } from "../components/layout";
import { responseError, responseHTML } from "../utils/response-utils";
import { RawDataPreview } from "../components/raw-data";
import { BuildTable } from "../components/builds-table";
import { getStore } from "../utils/store";
import { LabelsTable } from "../components/labels-table";
import {
  ProjectModel,
  ProjectCreateSchema,
  ProjectSchema,
} from "../models/projects";
import { urlSearchParamsToObject } from "../utils/url-utils";

export async function listProjects(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const { connectionString } = getStore();
    const projectModel = new ProjectModel(context, connectionString);
    const projects = await projectModel.list();

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout title="All Projects">
          <ProjectsTable
            projects={projects}
            caption={`Projects (${projects.length})`}
          />
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: projects };
  } catch (error) {
    return responseError(error, context, 500);
  }
}

export async function getProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId } = request.params;
  const { connectionString } = getStore();

  if (!projectId) {
    return { status: 400, body: "Missing project ID" };
  }

  try {
    const projectModel = new ProjectModel(context, connectionString);

    const project = await projectModel.get(projectId);
    const builds = await projectModel.buildModel(projectId).list();
    const labels = await projectModel.labelModel(projectId).list();

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title={project.name}
          breadcrumbs={[{ label: "Projects", href: urlBuilder.allProjects() }]}
        >
          <>
            <RawDataPreview data={project} summary={"Project details"} />
            <LabelsTable
              caption={
                <span>
                  Labels (<a href={urlBuilder.allLabels(projectId)}>View all</a>
                  )
                </span>
              }
              labels={labels}
              projectId={projectId}
            />
            <BuildTable
              caption={
                <span>
                  Latest builds (
                  <a href={urlBuilder.allBuilds(projectId)}>View all</a>)
                </span>
              }
              project={project}
              builds={builds}
              labels={labels}
            />
          </>
        </DocumentLayout>
      );
    }

    return {
      status: 200,
      jsonBody: { ...project, latestBuilds: builds, labels },
    };
  } catch (error) {
    return responseError(error, context, 404);
  }
}

export async function createProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const { connectionString } = getStore();

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

    const result = ProjectCreateSchema.safeParse(
      urlSearchParamsToObject(await request.formData())
    );
    if (!result.success) {
      return responseError(result.error, context, 400);
    }

    const model = new ProjectModel(context, connectionString);
    await model.create(result.data);

    const projectUrl = urlBuilder.projectId(result.data.id);
    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return { status: 303, headers: { Location: projectUrl } };
    }

    return {
      status: 201,
      headers: { Location: projectUrl },
      jsonBody: { data: result.data, links: { self: projectUrl } },
    };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function updateProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const { projectId } = request.params;
    const { connectionString } = getStore();

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

    const result = ProjectSchema.partial().safeParse(
      urlSearchParamsToObject(await request.formData())
    );
    if (!result.success) {
      return responseError(result.error, context, 400);
    }

    const model = new ProjectModel(context, connectionString);

    const data = result.data;
    await model.update(projectId, data);

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return { status: 303, headers: { Location: request.url } };
    }

    return {
      status: 202,
      headers: { Location: request.url },
      jsonBody: {
        data: await model.get(projectId),
        links: { self: request.url },
      },
    };
  } catch (error) {
    return responseError(error, context, 404);
  }
}

export async function deleteProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const { projectId } = request.params;
    if (!projectId) {
      return { status: 400, body: "Missing project ID" };
    }

    const { connectionString } = getStore();
    const model = new ProjectModel(context, connectionString);
    await model.delete(projectId);

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
