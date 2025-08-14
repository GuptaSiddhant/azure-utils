import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CONTENT_TYPES, QUERY_PARAMS } from "../utils/constants";
import { ProjectsTable } from "../components/projects-table";
import { DocumentLayout } from "../components/layout";
import {
  responseError,
  responseHTML,
  responseRedirect,
} from "../utils/response-utils";
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
import { urlBuilder } from "../utils/url-builder";
import { ProjectForm } from "../components/project-form";
import { checkIsHTMLRequest, checkIsHXRequest } from "../utils/request-utils";

export async function listProjects(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const isCreateMode = request.query.has(QUERY_PARAMS.newResource);
    if (isCreateMode) {
      return responseHTML(
        <DocumentLayout title="Create Project" breadcrumbs={["Projects"]}>
          <ProjectForm project={undefined} />
        </DocumentLayout>
      );
    }

    const { connectionString } = getStore();
    const projectModel = new ProjectModel(context, connectionString);
    const projects = await projectModel.list();

    if (checkIsHTMLRequest()) {
      return responseHTML(
        <DocumentLayout
          title="All Projects"
          toolbar={<a href={urlBuilder.projectCreate()}>+ Create</a>}
        >
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

    const isEditMode = request.query.has(QUERY_PARAMS.editResource);
    if (isEditMode) {
      return responseHTML(
        <DocumentLayout title="Edit Project" breadcrumbs={[projectId]}>
          <ProjectForm project={project} />
        </DocumentLayout>
      );
    }

    const builds = await projectModel.buildModel(projectId).list({ limit: 25 });
    const labels = await projectModel.labelModel(projectId).list({ limit: 25 });

    if (checkIsHTMLRequest()) {
      return responseHTML(
        <DocumentLayout
          title={project.name}
          breadcrumbs={[{ label: "Projects", href: urlBuilder.allProjects() }]}
          toolbar={
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <a href={urlBuilder.projectIdEdit(projectId)}>Edit</a>
              <form
                hx-delete={request.url}
                hx-confirm="Are you sure about deleting the project?"
              >
                <button>Delete</button>
              </form>
            </div>
          }
        >
          <>
            <RawDataPreview data={project} summary={"Project details"} />
            <LabelsTable
              caption={"Latest labels"}
              toolbar={<a href={urlBuilder.allLabels(projectId)}>View all</a>}
              labels={labels}
              projectId={projectId}
            />
            <BuildTable
              toolbar={<a href={urlBuilder.allBuilds(projectId)}>View all</a>}
              caption={"Latest builds"}
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

    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(projectUrl, 303);
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

    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(request.url, 303);
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
    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(projectsUrl, 303);
    }

    return { status: 204, headers: { Location: projectsUrl } };
  } catch (error) {
    return responseError(error, context, 404);
  }
}
