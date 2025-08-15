import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { CONTENT_TYPES } from "#utils/constants";
import { ProjectsTable } from "#components/projects-table";
import { DocumentLayout } from "#components/layout";
import {
  responseError,
  responseHTML,
  responseRedirect,
} from "#utils/response-utils";
import { RawDataPreview } from "#components/raw-data";
import { BuildTable } from "#components/builds-table";
import { LabelsTable } from "#components/labels-table";
import { urlSearchParamsToObject } from "#utils/url-utils";
import { urlBuilder } from "#utils/url-builder";
import { ProjectForm } from "#components/project-form";
import {
  checkIsEditMode,
  checkIsHTMLRequest,
  checkIsHXRequest,
  checkIsNewMode,
} from "#utils/request-utils";
import { ProjectIdModel, ProjectsModel } from "#projects/model";
import { BuildsModel } from "#builds/model";
import { LabelsModel } from "#labels/model";

export async function listProjects(): Promise<HttpResponseInit> {
  try {
    if (checkIsNewMode()) {
      return responseHTML(
        <DocumentLayout
          title="Create Project"
          breadcrumbs={[{ label: "Projects", href: urlBuilder.allProjects() }]}
        >
          <ProjectForm project={undefined} />
        </DocumentLayout>
      );
    }

    const projectsModel = new ProjectsModel();
    const projects = await projectsModel.list();

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
    return responseError(error, 500);
  }
}

export async function getProject(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId } = request.params;

  if (!projectId) {
    return { status: 400, body: "Missing project ID" };
  }

  try {
    const projectsModel = new ProjectIdModel(projectId);
    const project = await projectsModel.get();

    if (checkIsEditMode()) {
      return responseHTML(
        <DocumentLayout
          title="Edit Project"
          breadcrumbs={[
            { label: "Projects", href: urlBuilder.allProjects() },
            { label: projectId, href: urlBuilder.projectId(projectId) },
          ]}
        >
          <ProjectForm project={project} />
        </DocumentLayout>
      );
    }

    const [builds, labels] = await Promise.all([
      new BuildsModel(projectId).list({ limit: 25 }),
      new LabelsModel(projectId).list({ limit: 25 }),
    ]);

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
    return responseError(error, 404);
  }
}

export async function createProject(
  request: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType) {
      return responseError("Content-Type header is required", 400);
    }
    if (!contentType.includes(CONTENT_TYPES.FORM_ENCODED)) {
      return responseError(
        `Invalid Content-Type, expected ${CONTENT_TYPES.FORM_ENCODED}`,
        415
      );
    }

    const projectModel = new ProjectsModel();
    const data = await projectModel.create(
      urlSearchParamsToObject(await request.formData())
    );

    const projectUrl = urlBuilder.projectId(data.id);

    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(projectUrl, 303);
    }

    return {
      status: 201,
      headers: { Location: projectUrl },
      jsonBody: { data: data, links: { self: projectUrl } },
    };
  } catch (error) {
    return responseError(error);
  }
}

export async function updateProject(
  request: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const { projectId } = request.params;

    if (!projectId) {
      return { status: 400, body: "Missing project ID" };
    }

    const contentType = request.headers.get("content-type");
    if (!contentType) {
      return responseError("Content-Type header is required", 400);
    }
    if (!contentType.includes(CONTENT_TYPES.FORM_ENCODED)) {
      return responseError(
        `Invalid Content-Type, expected ${CONTENT_TYPES.FORM_ENCODED}`,
        415
      );
    }

    const projectModel = new ProjectIdModel(projectId);
    await projectModel.update(
      urlSearchParamsToObject(await request.formData())
    );

    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(request.url, 303);
    }

    return {
      status: 202,
      headers: { Location: request.url },
      jsonBody: {
        data: await projectModel.get(),
        links: { self: request.url },
      },
    };
  } catch (error) {
    return responseError(error, 404);
  }
}

export async function deleteProject(
  request: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const { projectId } = request.params;
    if (!projectId) {
      return { status: 400, body: "Missing project ID" };
    }

    const model = new ProjectIdModel(projectId);
    await model.delete();

    const projectsUrl = urlBuilder.allProjects();
    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(projectsUrl, 303);
    }

    return { status: 204, headers: { Location: projectsUrl } };
  } catch (error) {
    return responseError(error, 404);
  }
}
